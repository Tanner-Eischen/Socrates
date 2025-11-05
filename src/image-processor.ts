// Image Processor Module for SocraTeach Day 2
// Handles image upload, validation, and OCR processing using OpenAI Vision API

import * as fs from 'fs';
import * as path from 'path';
import { ImageProcessResult, UploadedFile, ValidationResult } from './types';

export class ImageProcessor {
  private static readonly SUPPORTED_FORMATS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  private static readonly PROCESSING_TIMEOUT = 30000; // 30 seconds
  
  private static apiKey: string = '';
  
  /**
   * Initialize the image processor with OpenAI API key
   */
  public static initialize(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Validate an uploaded image file
   */
  public static validateImageFile(filePath: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        errors.push('File does not exist. Please check the file path.');
        return { isValid: false, errors, warnings, suggestions };
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      
      // Check file size
      if (stats.size > this.MAX_FILE_SIZE) {
        errors.push(`File size (${this.formatFileSize(stats.size)}) exceeds maximum allowed size (${this.formatFileSize(this.MAX_FILE_SIZE)}).`);
        suggestions.push('Try compressing the image or using a smaller resolution.');
      }

      // Check file extension
      const extension = path.extname(filePath).toLowerCase().substring(1);
      if (!this.SUPPORTED_FORMATS.includes(extension)) {
        errors.push(`Unsupported file format: .${extension}`);
        suggestions.push(`Supported formats: ${this.SUPPORTED_FORMATS.map(f => `.${f}`).join(', ')}`);
      }

      // Check if file is readable
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
      } catch {
        errors.push('File is not readable. Please check file permissions.');
      }

      // File size warnings
      if (stats.size < 1024) {
        warnings.push('File is very small. This might affect OCR accuracy.');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };

    } catch (error) {
      errors.push(`File validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors, warnings, suggestions };
    }
  }

  /**
   * Process an image file and extract mathematical content using OCR
   */
  public static async processImage(filePath: string): Promise<ImageProcessResult> {
    const startTime = Date.now();
    
    try {
      // Validate file first
      const validation = this.validateImageFile(filePath);
      if (!validation.isValid) {
        return {
          extractedText: '',
          confidence: 0,
          processingTime: Date.now() - startTime,
          success: false,
          error: validation.errors.join('; ')
        };
      }

      // Check API key
      if (!this.apiKey) {
        return {
          extractedText: '',
          confidence: 0,
          processingTime: Date.now() - startTime,
          success: false,
          error: 'OpenAI API key not configured'
        };
      }

      // Convert image to base64
      const imageBase64 = this.convertToBase64(filePath);
      const mimeType = this.getMimeType(filePath);

      // Call OpenAI Vision API
      const extractedText = await this.callVisionAPI(imageBase64, mimeType);
      
      // Calculate confidence based on content quality
      const confidence = this.calculateConfidence(extractedText);
      
      return {
        extractedText: extractedText.trim(),
        confidence,
        processingTime: Date.now() - startTime,
        success: true
      };

    } catch (error) {
      return {
        extractedText: '',
        confidence: 0,
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      };
    }
  }

  /**
   * Convert image file to base64 string
   */
  private static convertToBase64(filePath: string): string {
    try {
      const imageBuffer = fs.readFileSync(filePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      throw new Error(`Failed to read image file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get MIME type based on file extension
   */
  private static getMimeType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mimeTypes[extension] || 'image/jpeg';
  }

  /**
   * Call OpenAI Vision API to extract text from image
   */
  private static async callVisionAPI(imageBase64: string, mimeType: string): Promise<string> {
    // Build a list of models to attempt, prioritizing configured model
    const configuredModel = process.env.OPENAI_MODEL;
    const modelsToTry = [
      configuredModel,
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-vision-preview'
    ].filter(Boolean) as string[];

    const buildRequestBody = (model: string) => ({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract the mathematical problem from this image. Please:
1. Return ONLY the mathematical problem text, equations, or expressions
2. Preserve mathematical notation (use ^ for exponents, * for multiplication)
3. If there are multiple problems, separate them with semicolons
4. If no mathematical content is found, return "NO_MATH_CONTENT"
5. Do not include explanations or additional text`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.1 // Low temperature for consistent extraction
    });

    const errors: string[] = [];

    for (const model of modelsToTry) {
      const requestBody = buildRequestBody(model);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.PROCESSING_TIMEOUT);
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as any;
          errors.push(`Model ${model}: ${response.status} - ${errorData.error?.message || response.statusText}`);
          continue; // try next model
        }

        const data = await response.json() as any;
        if (!data.choices || data.choices.length === 0) {
          errors.push(`Model ${model}: No choices returned`);
          continue;
        }

        const extractedText = (data.choices[0].message?.content || '').trim();
        if (!extractedText || extractedText === 'NO_MATH_CONTENT') {
          errors.push(`Model ${model}: No mathematical content detected`);
          continue;
        }

        return extractedText;
      } catch (error) {
        clearTimeout(timeout);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Model ${model}: ${msg}`);
        // Try next model
      }
    }

    throw new Error(`Failed OCR via OpenAI Vision models: ${errors.join(' | ')}`);
  }

  /**
   * Calculate confidence score based on extracted text quality
   */
  private static calculateConfidence(text: string): number {
    if (!text || text.length === 0) return 0;
    
    let confidence = 0.5; // Base confidence
    
    // Check for mathematical indicators
    if (/\d/.test(text)) confidence += 0.2; // Contains numbers
    if (/[+\-*/=^]/.test(text)) confidence += 0.2; // Contains operators
    if (/[a-z]/i.test(text)) confidence += 0.1; // Contains variables
    if (/solve|find|calculate|equation/i.test(text)) confidence += 0.1; // Contains math keywords
    
    // Penalize for unclear content
    if (text.includes('?') || text.includes('unclear')) confidence -= 0.2;
    if (text.length < 5) confidence -= 0.3;
    if (text.includes('cannot') || text.includes('unable')) confidence -= 0.4;
    
    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Create uploaded file metadata
   */
  public static createFileMetadata(filePath: string): UploadedFile {
    const stats = fs.statSync(filePath);
    const extension = path.extname(filePath).toLowerCase();
    
    return {
      originalName: path.basename(filePath),
      path: filePath,
      size: stats.size,
      mimeType: this.getMimeType(filePath),
      uploadedAt: new Date()
    };
  }

  /**
   * Clean up temporary files
   */
  public static cleanupTempFiles(filePaths: string[]): void {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.warn(`Failed to cleanup file ${filePath}:`, error);
      }
    }
  }

  /**
   * Generate processing status message
   */
  public static generateStatusMessage(result: ImageProcessResult): string {
    if (!result.success) {
      return `❌ Image Processing Failed:\n   Error: ${result.error}\n   Processing Time: ${result.processingTime}ms`;
    }
    
    const confidencePercent = Math.round(result.confidence * 100);
    const confidenceIcon = confidencePercent >= 80 ? '✅' : confidencePercent >= 60 ? '⚠️' : '❌';
    
    return [
      `${confidenceIcon} Image Processing Complete:`,
      `   Extracted Text: "${result.extractedText}"`,
      `   Confidence: ${confidencePercent}%`,
      `   Processing Time: ${result.processingTime}ms`
    ].join('\n');
  }

  /**
   * Validate OCR result quality
   */
  public static validateOCRResult(result: ImageProcessResult): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!result.success) {
      errors.push(result.error || 'OCR processing failed');
      return { isValid: false, errors, warnings, suggestions };
    }

    // Check confidence level
    if (result.confidence < 0.3) {
      errors.push('OCR confidence is very low. The image may be unclear or contain no mathematical content.');
      suggestions.push('Try uploading a clearer image with better lighting and resolution.');
    } else if (result.confidence < 0.6) {
      warnings.push('OCR confidence is moderate. Please review the extracted text carefully.');
      suggestions.push('Consider re-uploading with a higher quality image if the text looks incorrect.');
    }

    // Check extracted text quality
    if (!result.extractedText || result.extractedText.length < 3) {
      errors.push('No meaningful text was extracted from the image.');
      suggestions.push('Ensure the image contains clear mathematical content and try again.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
}