import * as XLSX from 'xlsx';

// PDF 파싱 결과
export interface ParsedPDFResult {
    text: string;
    pageCount: number;
    info?: Record<string, unknown>;
}

// Excel 파싱 결과
export interface ParsedExcelResult {
    sheets: {
        name: string;
        data: Record<string, unknown>[];
        rawText: string;
    }[];
    totalRows: number;
}

// 통합 파싱 결과
export interface ParsedFileResult {
    type: 'pdf' | 'excel' | 'csv';
    rawText: string;
    structuredData?: Record<string, unknown>[];
    metadata: {
        pageCount?: number;
        sheetCount?: number;
        rowCount?: number;
    };
}

/**
 * PDF 파일 파싱
 * @param buffer - PDF 파일의 Buffer
 * @returns 추출된 텍스트와 메타데이터
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedPDFResult> {
    try {
        // pdf-parse 사용 (CommonJS 모듈)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse/lib/pdf-parse');

        const data = await pdfParse(buffer);

        return {
            text: data.text || '',
            pageCount: data.numpages || 1,
            info: data.info,
        };
    } catch (error) {
        console.error('PDF parsing error:', error);

        // pdf-parse가 실패하면 기본 텍스트 추출 시도
        try {
            // Buffer에서 텍스트 추출 시도 (간단한 fallback)
            const text = buffer.toString('utf-8');
            // PDF 바이너리에서 텍스트를 추출하는 간단한 방법
            const textMatches = text.match(/\((.*?)\)/g) || [];
            const extractedText = textMatches
                .map(m => m.slice(1, -1))
                .filter(t => t.length > 2 && !/^[\\x00-\\x1F]+$/.test(t))
                .join(' ');

            if (extractedText.length > 50) {
                return {
                    text: extractedText,
                    pageCount: 1,
                    info: { fallback: true },
                };
            }
        } catch {
            // fallback도 실패
        }

        throw new Error('PDF 파일을 파싱할 수 없습니다. 다른 파일 형식을 사용해주세요.');
    }
}

/**
 * Excel 파일 파싱 (XLSX, XLS)
 * @param buffer - Excel 파일의 Buffer
 * @returns 추출된 데이터와 메타데이터
 */
export function parseExcel(buffer: Buffer): ParsedExcelResult {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        const sheets = workbook.SheetNames.map((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];

            // JSON으로 변환
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1, // 첫 번째 행도 데이터로 처리
                defval: '', // 빈 셀을 빈 문자열로
            }) as unknown[][];

            // 텍스트로 변환 (각 행을 탭으로 구분, 각 행은 줄바꿈으로 구분)
            const rawText = jsonData
                .map((row) => (row as unknown[]).join('\t'))
                .join('\n');

            // 객체 배열로 변환 (첫 번째 행을 헤더로 사용)
            const headers = jsonData[0] as string[];
            const dataRows = jsonData.slice(1).map((row) => {
                const obj: Record<string, unknown> = {};
                (row as unknown[]).forEach((cell, index) => {
                    const header = headers[index] || `col_${index}`;
                    obj[header] = cell;
                });
                return obj;
            });

            return {
                name: sheetName,
                data: dataRows,
                rawText,
            };
        });

        const totalRows = sheets.reduce((sum, sheet) => sum + sheet.data.length, 0);

        return {
            sheets,
            totalRows,
        };
    } catch (error) {
        console.error('Excel parsing error:', error);
        throw new Error('Excel 파일을 파싱할 수 없습니다.');
    }
}

/**
 * CSV 파일 파싱
 * @param buffer - CSV 파일의 Buffer
 * @returns 추출된 데이터와 메타데이터
 */
export function parseCSV(buffer: Buffer): ParsedExcelResult {
    // CSV도 xlsx 라이브러리로 파싱 가능
    return parseExcel(buffer);
}

/**
 * 파일 타입에 따라 적절한 파서 선택 및 실행
 * @param buffer - 파일 Buffer
 * @param fileType - 파일 타입 ('pdf', 'xlsx', 'xls', 'csv')
 * @returns 통합 파싱 결과
 */
export async function parseFile(
    buffer: Buffer,
    fileType: string
): Promise<ParsedFileResult> {
    switch (fileType.toLowerCase()) {
        case 'pdf': {
            const pdfResult = await parsePDF(buffer);
            return {
                type: 'pdf',
                rawText: pdfResult.text,
                metadata: {
                    pageCount: pdfResult.pageCount,
                },
            };
        }

        case 'xlsx':
        case 'xls': {
            const excelResult = parseExcel(buffer);
            // 모든 시트의 텍스트를 합침
            const rawText = excelResult.sheets
                .map((sheet) => `=== ${sheet.name} ===\n${sheet.rawText}`)
                .join('\n\n');
            // 모든 시트의 데이터를 합침
            const structuredData = excelResult.sheets.flatMap((sheet) => sheet.data);

            return {
                type: 'excel',
                rawText,
                structuredData,
                metadata: {
                    sheetCount: excelResult.sheets.length,
                    rowCount: excelResult.totalRows,
                },
            };
        }

        case 'csv': {
            const csvResult = parseCSV(buffer);
            const rawText = csvResult.sheets[0]?.rawText || '';
            const structuredData = csvResult.sheets[0]?.data || [];

            return {
                type: 'csv',
                rawText,
                structuredData,
                metadata: {
                    rowCount: csvResult.totalRows,
                },
            };
        }

        default:
            throw new Error(`지원하지 않는 파일 형식입니다: ${fileType}`);
    }
}

/**
 * 견적서 텍스트에서 주요 정보 추출을 위한 전처리
 * - 불필요한 공백 제거
 * - 특수문자 정규화
 * @param text - 원본 텍스트
 * @returns 전처리된 텍스트
 */
export function preprocessEstimateText(text: string): string {
    return text
        // 연속된 공백을 하나로
        .replace(/[ \t]+/g, ' ')
        // 연속된 줄바꿈을 두 개로 제한
        .replace(/\n{3,}/g, '\n\n')
        // 앞뒤 공백 제거
        .trim();
}
