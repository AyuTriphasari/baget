
const fs = require('fs');
const path = require('path');

try {
    const content = fs.readFileSync('deploy_output.txt', 'utf8'); // Try utf8 first
    console.log(content);
} catch (e) {
    try {
        const content = fs.readFileSync('deploy_output.txt', 'utf16le'); // Try utf16le if created by powershell redirection
        console.log(content);
    } catch (err) {
        console.error("Failed to read file:", err);
    }
}
