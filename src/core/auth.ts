// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/core.md (§ auth.ts — Authentication)
//     If cookie parsing logic, format support, or exports change, update the docs.
import * as fs from 'fs';

export function loadCookies(cookieFile: string = 'cookies.txt'): string {
    if (!fs.existsSync(cookieFile)) {
        throw new Error(`Cookie file '${cookieFile}' not found. Please provide valid Instagram cookies.`);
    }

    const content = fs.readFileSync(cookieFile, 'utf8');
    const lines = content.split('\n');
    
    let cookies: string[] = [];
    
    for (const line of lines) {
        if ((line.startsWith('#') && !line.startsWith('#HttpOnly_')) || line.trim() === '') continue;
        
        const parts = line.split('\t');
        if (parts.length >= 7) {
            const name = parts[5];
            const value = parts[6].trim();
            cookies.push(`${name}=${value}`);
        }
    }
    
    return cookies.join('; ');
}

export function extractCsrfToken(cookieString: string): string {
    const match = cookieString.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
}
