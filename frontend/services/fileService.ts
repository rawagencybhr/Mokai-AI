
// @ts-ignore
declare const XLSX: any;
// @ts-ignore
declare const mammoth: any;

export interface FileProcessingResult {
  fileName: string;
  content: string;
  type: 'excel' | 'word' | 'text';
}

export const processFile = async (file: File): Promise<FileProcessingResult> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
      return await parseExcel(file);
    } else if (extension === 'docx') {
      return await parseWord(file);
    } else if (extension === 'txt') {
      return await parseText(file);
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('File processing error:', error);
    throw error;
  }
};

const parseExcel = (file: File): Promise<FileProcessingResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let fullText = '';
        
        workbook.SheetNames.forEach((sheetName: string) => {
          const worksheet = workbook.Sheets[sheetName];
          // Convert to CSV for structured text representation
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          fullText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
        });

        resolve({
          fileName: file.name,
          content: fullText,
          type: 'excel'
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

const parseWord = (file: File): Promise<FileProcessingResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      mammoth.extractRawText({ arrayBuffer: arrayBuffer })
        .then((result: any) => {
          resolve({
            fileName: file.name,
            content: result.value, // The raw text
            type: 'word'
          });
        })
        .catch(reject);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

const parseText = (file: File): Promise<FileProcessingResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        fileName: file.name,
        content: e.target?.result as string,
        type: 'text'
      });
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};
