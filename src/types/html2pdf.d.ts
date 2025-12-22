declare module 'html2pdf.js' {
    interface Html2PdfOptions {
        margin?: number | [number, number, number, number];
        filename?: string;
        image?: { type?: string; quality?: number };
        html2canvas?: {
            scale?: number;
            useCORS?: boolean;
            logging?: boolean;
            letterRendering?: boolean;
            backgroundColor?: string;
            onclone?: (clonedDoc: Document) => void;
        };
        jsPDF?: {
            unit?: string;
            format?: string | [number, number];
            orientation?: 'portrait' | 'landscape';
        };
        pagebreak?: {
            mode?: string[];
            before?: string;
            after?: string;
            avoid?: string;
        };
    }

    interface Html2Pdf {
        set(options: Html2PdfOptions): Html2Pdf;
        from(element: HTMLElement | string): Html2Pdf;
        save(): Promise<void>;
        toPdf(): Html2Pdf;
        get(type: string): Promise<unknown>;
        output(type: string, options?: unknown): Promise<string | Blob>;
    }

    function html2pdf(): Html2Pdf;
    export default html2pdf;
}
