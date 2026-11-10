import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StorageService } from '../../src/services/storage.service';

describe('Storage & Anti-Exploit Security Validation', () => {
  it('should block dangerous executable and script extensions', () => {
    const dangerousFiles = [
      'malware.exe',
      'backdoor.php',
      'shell.sh',
      'exploit.svg', // SVG XSS prevention
      'script.bat',
      'payload.js',
      'trojan.dll'
    ];

    for (const file of dangerousFiles) {
      const result = StorageService.validateFile(file, Buffer.from('dummy-content'), 'application/octet-stream');
      assert.strictEqual(result.isValid, false, `Should reject dangerous extension: ${file}`);
      assert.match(result.error || '', /محظور تماماً/);
    }
  });

  it('should block path traversal attacks', () => {
    const traversalAttacks = [
      '../../etc/passwd',
      '..\\..\\windows\\system32\\cmd.exe',
      'folder/../../secret.env'
    ];

    for (const attack of traversalAttacks) {
      const result = StorageService.validateFile(attack, Buffer.from('data'), 'image/png');
      assert.strictEqual(result.isValid, false, `Should reject path traversal: ${attack}`);
    }
  });

  it('should validate genuine JPEG and PNG magic bytes', () => {
    // Valid JPEG Header: FF D8 FF E0 ...
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const jpegResult = StorageService.validateFile('receipt.jpg', jpegBuffer, 'image/jpeg');
    assert.strictEqual(jpegResult.isValid, true);

    // Valid PNG Header: 89 50 4E 47 0D 0A 1A 0A
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pngResult = StorageService.validateFile('receipt.png', pngBuffer, 'image/png');
    assert.strictEqual(pngResult.isValid, true);
  });

  it('should reject Mime-Type spoofing (executable or text pretending to be an image)', () => {
    const spoofedBuffer = Buffer.from('<?php echo "hacked"; ?>');
    const result = StorageService.validateFile('fake-image.jpg', spoofedBuffer, 'image/jpeg');
    assert.strictEqual(result.isValid, false);
    assert.match(result.error || '', /لا يطابق الامتداد/);
  });

  it('should validate genuine PDF magic bytes', () => {
    // %PDF-1.4
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const result = StorageService.validateFile('statement.pdf', pdfBuffer, 'application/pdf');
    assert.strictEqual(result.isValid, true);
  });
});
