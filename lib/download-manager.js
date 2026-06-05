/**
 * Download Manager — reusable download/export helpers for site pages.
 *
 * API:
 *   await window.AppDownloads.handleDownload(type, { getContentEl, getTitle })
 *
 * Parameters:
 *   - type: string. One of 'pdf', 'png', 'svg', 'html', 'json', 'md', etc.
 *   - getContentEl: () => Element — returns the root element to export.
 *   - getTitle: () => string — returns a title used for filenames.
 *
 * Examples:
 *
 *   // Simple call from a page or component
 *   window.AppDownloads?.handleDownload('pdf', {
 *     getContentEl: () => document.querySelector('.people-page__content'),
 *     getTitle: () => document.querySelector('.people-page__title')?.textContent?.trim() || 'profile'
 *   });
 *
 *   // Bind to a button
 *   document.getElementById('download-png')?.addEventListener('click', () => {
 *     window.AppDownloads?.handleDownload('png', {
 *       getContentEl: () => document.querySelector('.profile-main'),
 *       getTitle: () => 'Nelson_Mandela'
 *     });
 *   });
 *
 * Supported types & behavior:
 *   - 'pdf': opens a print window (user can Save as PDF).
 *   - 'png': prefers html2canvas, falls back to SVG->canvas->PNG.
 *   - 'svg': exports an SVG snapshot using foreignObject.
 *   - 'html': outputs a self-contained HTML file with styles.
 *   - 'json': outputs JSON { title, content }.
 *   - 'md' / 'txt': outputs plain text from element.innerText.
 *   - 'gedcom' / 'epub': currently fallback to HTML (not implemented).
 *
 * Notes:
 *   - The manager attempts to inline images (fetch + FileReader) to reduce canvas tainting.
 *   - html2canvas is loaded dynamically from DEFAULT_HTML2CANVAS_CDN when needed.
 *   - Cross-origin stylesheets or images may limit fidelity due to browser CORS restrictions.
 *
 * Integration:
 *   - Include directly: <script defer src="/lib/download-manager.js"></script>
 *   - Or let pages dynamically load the script and then call handleDownload.
 *
 * Limitations:
 *   - Complex exports (GEDCOM/EPUB) are not implemented here.
 *   - For production-quality PDFs consider server-side generation.
 */
(function (window, document) {
    'use strict';

    const DEFAULT_HTML2CANVAS_CDN = 'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js';

    const collectCss = () => {
        let cssText = '';
        document.querySelectorAll('style').forEach((s) => { cssText += s.innerHTML; });
        for (const sheet of Array.from(document.styleSheets)) {
            try {
                const rules = sheet.cssRules;
                for (const r of Array.from(rules || [])) cssText += r.cssText;
            } catch (e) {
                // ignore cross-origin stylesheets
            }
        }
        return cssText;
    };

    const downloadBlob = (filename, blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    };

    const inlineImages = async (root) => {
        const imgs = Array.from(root.querySelectorAll('img'));
        await Promise.all(imgs.map(async (img) => {
            try {
                const src = img.getAttribute('src') || '';
                if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
                const abs = new URL(src, window.location.href).href;
                const resp = await fetch(abs, { mode: 'cors' });
                if (!resp.ok) return;
                const blob = await resp.blob();
                return await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        img.setAttribute('src', reader.result);
                        resolve(true);
                    };
                    reader.onerror = () => resolve(false);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                return false;
            }
        }));
    };

    const ensureHtml2Canvas = async () => {
        if (window.html2canvas) return true;
        try {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = DEFAULT_HTML2CANVAS_CDN;
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        } catch (e) {
            return false;
        }
        return Boolean(window.html2canvas);
    };

    async function downloadAsHtml(contentEl, title, type) {
        const filenameBase = (title || document.title || 'profile').replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
        const ext = (type === 'html' || type === 'htm') ? 'html' : (type === 'json' ? 'json' : (type === 'markdown' || type === 'md' ? 'md' : (type === 'txt' ? 'txt' : 'html')));

        let payload;
        let mime;
        if (ext === 'html') {
            const styleEls = [];
            document.querySelectorAll('link[rel="stylesheet"], style').forEach((el) => {
                if (el.tagName.toLowerCase() === 'link') {
                    const href = el.getAttribute('href') || '';
                    if (href) styleEls.push(`<link rel="stylesheet" href="${new URL(href, window.location.href).href}">`);
                } else {
                    styleEls.push(`<style>${el.innerHTML}</style>`);
                }
            });
            payload = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${styleEls.join('')}</head><body>${contentEl.innerHTML}</body></html>`;
            mime = 'text/html';
        } else if (ext === 'json') {
            payload = JSON.stringify({ title, content: contentEl.innerText }, null, 2);
            mime = 'application/json';
        } else if (ext === 'md') {
            payload = contentEl.innerText;
            mime = 'text/markdown';
        } else {
            payload = contentEl.innerText;
            mime = 'text/plain';
        }

        const blob = new Blob([payload], { type: mime + ';charset=utf-8' });
        downloadBlob(`${filenameBase}.${ext}`, blob);
        return true;
    }

    async function downloadAsPdf(contentEl, title) {
        const styleEls = [];
        document.querySelectorAll('link[rel="stylesheet"], style').forEach((el) => {
            if (el.tagName.toLowerCase() === 'link') {
                const href = el.getAttribute('href') || '';
                if (href) {
                    const linkHref = new URL(href, window.location.href).href;
                    styleEls.push(`<link rel="stylesheet" href="${linkHref}">`);
                }
            } else {
                styleEls.push(`<style>${el.innerHTML}</style>`);
            }
        });

        const docHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${styleEls.join('')}</head><body>${contentEl.innerHTML}</body></html>`;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return false;
        }
        try {
            printWindow.document.open();
            printWindow.document.write(docHtml);
            printWindow.document.close();
            const tryPrint = () => {
                try {
                    printWindow.focus();
                    printWindow.print();
                    setTimeout(() => { try { printWindow.close(); } catch (e) { } }, 500);
                } catch (err) {
                    console.error('Print failed', err);
                }
            };
            printWindow.onload = () => tryPrint();
            setTimeout(() => tryPrint(), 1500);
            return true;
        } catch (err) {
            console.error('Could not open print window', err);
            window.print();
            return false;
        }
    }

    async function downloadAsImage(contentEl, title, format = 'png') {
        const filenameBase = (title || document.title || 'profile').replace(/[^a-z0-9-_]/gi, '_').toLowerCase();

        // Try html2canvas first for PNG
        if (format === 'png') {
            const ok = await ensureHtml2Canvas().catch(() => false);
            if (ok) {
                try {
                    const canvas = await window.html2canvas(contentEl, { useCORS: true, backgroundColor: null });
                    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                    if (blob) {
                        downloadBlob(`${filenameBase}.png`, blob);
                        return true;
                    }
                } catch (err) {
                    console.warn('html2canvas render failed', err);
                }
            }
        }

        // Fallback: SVG -> canvas
        try {
            const clone = contentEl.cloneNode(true);
            clone.querySelectorAll('script').forEach((s) => s.remove());
            await inlineImages(clone).catch(() => { });
            const width = Math.max(1, Math.ceil(clone.scrollWidth || contentEl.getBoundingClientRect().width));
            const height = Math.max(1, Math.ceil(clone.scrollHeight || contentEl.getBoundingClientRect().height));
            const css = collectCss();
            const xhtml = `<div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:${width}px">${clone.innerHTML}</div>`;
            const svg = `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>\n<foreignObject width='100%' height='100%'>\n<style>${css}</style>\n${xhtml}\n</foreignObject>\n</svg>`;

            if (format === 'svg') {
                const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
                downloadBlob(`${filenameBase}.svg`, blob);
                return true;
            }

            // PNG via canvas
            const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            return await new Promise((resolve) => {
                img.onload = () => {
                    try {
                        const DPR = window.devicePixelRatio || 1;
                        const maxDim = 16384;
                        let scale = DPR;
                        if (width * scale > maxDim) scale = Math.max(1, Math.floor(maxDim / width));
                        if (height * scale > maxDim) scale = Math.max(1, Math.floor(maxDim / height));
                        const canvas = document.createElement('canvas');
                        canvas.width = Math.min(Math.ceil(width * scale), maxDim);
                        canvas.height = Math.min(Math.ceil(height * scale), maxDim);
                        const ctx = canvas.getContext('2d');
                        try { ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } catch (e) { }
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        canvas.toBlob((blob) => {
                            if (!blob) { URL.revokeObjectURL(url); resolve(false); return; }
                            downloadBlob(`${filenameBase}.png`, blob);
                            URL.revokeObjectURL(url);
                            resolve(true);
                        }, 'image/png');
                    } catch (e) { URL.revokeObjectURL(url); resolve(false); }
                };
                img.onerror = () => { try { URL.revokeObjectURL(url); } catch (e) { }; resolve(false); };
                img.src = url;
            });
        } catch (err) {
            console.error('Image export failed', err);
            return false;
        }
    }

    const Manager = {
        async handleDownload(type, { getContentEl, getTitle } = {}) {
            const contentEl = typeof getContentEl === 'function' ? getContentEl() : null;
            const title = typeof getTitle === 'function' ? getTitle() : (document.title || 'profile');
            if (!contentEl) return false;
            switch ((type || '').toLowerCase()) {
                case 'pdf':
                    return await downloadAsPdf(contentEl, title);
                case 'png':
                    return await downloadAsImage(contentEl, title, 'png');
                case 'svg':
                    return await downloadAsImage(contentEl, title, 'svg');
                case 'html':
                case 'htm':
                    return await downloadAsHtml(contentEl, title, 'html');
                case 'json':
                    return await downloadAsHtml(contentEl, title, 'json');
                case 'markdown':
                case 'md':
                    return await downloadAsHtml(contentEl, title, 'md');
                default:
                    if (type === 'gedcom' || type === 'epub') {
                        return await downloadAsHtml(contentEl, title, 'html');
                    }
                    return await downloadAsHtml(contentEl, title, 'html');
            }
        }
    };

    window.AppDownloads = Manager;
})(window, document);
