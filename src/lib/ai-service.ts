import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

// Extract full text from PDF
export async function extractTextFromPdf(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<{ text: string; numPages: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfDoc.numPages;
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');

    fullText += `\n--- หน้าที่ ${i} ---\n` + pageText + '\n';
    if (onProgress) onProgress(i, numPages);
  }

  return { text: fullText.trim(), numPages };
}

// Call Google Gemini API with smart model fallback
export async function callGeminiApi(
  prompt: string,
  systemInstruction?: string,
  apiKey?: string,
  preferredModel = 'gemini-3.5-flash'
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('ยังไม่ได้กำหนด Gemini API Key กรุณาไปที่เมนูตั้งค่าผู้ดูแล (Admin) เพื่อใส่ API Key');
  }

  // List of fallback models in priority order
  const modelCandidates = [
    preferredModel,
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-3.7-flash',
  ].filter((m, idx, self) => m && self.indexOf(m) === idx);

  let lastErrorMsg = '';

  for (const model of modelCandidates) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

    const requestBody: any = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        lastErrorMsg = errorMsg;

        // If model not found or overloaded, try next model candidate in loop
        if (response.status === 404 || errorMsg.includes('not found') || errorMsg.includes('high demand')) {
          console.warn(`Model ${model} unavailable (${errorMsg}), trying next fallback model...`);
          continue;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new Error('ไม่พบคำตอบจาก AI หรือเนื้อหาอาจถูกบล็อกตามนโยบายความปลอดภัย');
      }

      return candidate.content.parts[0].text;
    } catch (err: any) {
      lastErrorMsg = err.message || String(err);
      console.warn(`Error with ${model}:`, err);
    }
  }

  throw new Error(`เกิดข้อผิดพลาดจาก Gemini AI: ${lastErrorMsg}`);
}

// 1. AI Summarize Document
export async function summarizePdf(
  pdfText: string,
  summaryType: 'bullet' | 'detailed' | 'action_items',
  apiKey: string,
  model = 'gemini-1.5-flash'
): Promise<string> {
  const typeInstructions = {
    bullet: 'สรุปเป็นประเด็นสำคัญ สั้น กระชับ เป็นข้อๆ ไม่เกิน 5-7 ข้อ พร้อมระบุสาระสำคัญที่สุด',
    detailed: 'สรุปเนื้อหาอย่างละเอียด แบ่งเป็นหัวข้อ: 1. วัตถุประสงค์และที่มา 2. สาระสำคัญ 3. ผลกระทบ/สิ่งที่ต้องทราบ 4. บทสรุป',
    action_items: 'วิเคราะห์และสรุปเฉพาะ "สิ่งที่ผู้เกี่ยวข้องต้องปฏิบัติ (Action Items)" กำหนดการ และขั้นตอนดำเนินการอย่างชัดเจน',
  }[summaryType];

  const prompt = `กรุณาสรุปเนื้อหาจากเอกสารต่อไปนี้ โดยใช้ภาษาไทยที่กระชับ ชัดเจน เข้าใจง่าย:
รูปแบบการสรุป: ${typeInstructions}

เนื้อหาเอกสาร:
"""
${pdfText.slice(0, 40000)}
"""`;

  const systemInstruction = `คุณคือผู้ช่วย AI สรุปเอกสารราชการและเอกสารวิชาการสำหรับโรงเรียน ให้บริการสรุปใจความสำคัญอย่างแม่นยำ ไม่เติมแต่งข้อมูลที่ไม่มีในเอกสาร และจัดรูปแบบข้อความด้วย Markdown ที่อ่านง่ายสวยงาม`;

  return await callGeminiApi(prompt, systemInstruction, apiKey, model);
}

// 2. AI Chat with PDF
export async function chatWithPdf(
  pdfText: string,
  history: { role: 'user' | 'model'; text: string }[],
  question: string,
  apiKey: string,
  model = 'gemini-1.5-flash'
): Promise<string> {
  const historyText = history
    .slice(-6)
    .map((h) => `${h.role === 'user' ? 'ผู้ใช้' : 'AI'}: ${h.text}`)
    .join('\n');

  const prompt = `เอกสารอ้างอิง:
"""
${pdfText.slice(0, 40000)}
"""

ประวัติการสนทนา:
${historyText}

คำถามจากผู้ใช้: "${question}"

กรุณาตอบคำถามโดยอิงจากเนื้อหาในเอกสารอ้างอิงด้านบนเป็นหลัก หากมีข้อมูลในเอกสารให้ระบุชัดเจนพร้อมระบุเลขหน้า/หัวข้อหากมี หากในเอกสารไม่มีข้อมูลดังกล่าว ให้ตอบอย่างสุภาพว่าไม่พบข้อมูลในเอกสารนี้`;

  const systemInstruction = `คุณคือผู้ช่วยตอบคำถามจากเอกสาร PDF สำหรับคุณครูและบุคลากร ตอบคำถามอย่างสุภาพ ถูกต้อง ชัดเจน และตรงประเด็น`;

  return await callGeminiApi(prompt, systemInstruction, apiKey, model);
}

// 3. AI Draft Official Memo
export interface OfficialMemoInput {
  memoType: 'internal' | 'external' | 'project' | 'travel' | 'report';
  department: string;
  docNumber?: string;
  dateStr: string;
  subject: string;
  recipient: string;
  senderName: string;
  senderPosition: string;
  mainDetails: string;
  attachments?: string;
}

export async function draftOfficialMemo(
  input: OfficialMemoInput,
  apiKey: string,
  model = 'gemini-3.5-flash'
): Promise<string> {
  const prompt = `กรุณาร่างหนังสือราชการ / บันทึกข้อความ ตามข้อมูลต่อไปนี้:
- ประเภทหนังสือ: ${input.memoType}
- ส่วนราชการ: ${input.department || 'โรงเรียน...'}
- ที่: ${input.docNumber || 'ที่ ศธ ....../.......'}
- วันที่: ${input.dateStr}
- เรื่อง: ${input.subject}
- เรียน: ${input.recipient || 'ผู้อำนวยการโรงเรียน...'}
- ข้อมูล/ประเด็นความประสงค์: ${input.mainDetails}
- สิ่งที่ส่งมาด้วย (ถ้ามี): ${input.attachments || '-'}
- ผู้เสนอเรื่อง: ${input.senderName} (${input.senderPosition})

คำแนะนำในการร่าง:
1. จัดโครงสร้างบันทึกข้อความตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และที่แก้ไขเพิ่มเติม
2. โครงสร้างเนื้อหาต้องมี 3 ย่อหน้าหลัก:
   - ย่อหน้า 1 (ต้นเรื่อง/ความเป็นมา): เริ่มต้นด้วยคำว่า "ด้วย..."
   - ย่อหน้า 2 (ข้อเท็จจริง/เหตุผลความจำเป็น): เริ่มต้นด้วย "ในการนี้...", "ข้าพเจ้าได้...", หรือ "เนื่องด้วย..."
   - ย่อหน้า 3 (ข้อเสนอเพื่อโปรดพิจารณา): เริ่มต้นด้วย "จึงเรียนมาเพื่อโปรดพิจารณา..." (เช่น โปรดพิจารณาอนุมัติ / โปรดพิจารณาอนุญาต / โปรดลงนาม)
3. ใช้ภาษาทางการ สละสลวย ถูกต้องตามแบบแผนหนังสือราชการไทย
4. จัดรูปแบบข้อความแบบพร้อมพิมพ์ใช้งาน`;

  const systemInstruction = `คุณคือนักจัดการงานสารบรรณระดับเชี่ยวชาญและผู้เชี่ยวชาญภาษาหนังสือราชการไทย หน้าที่ของคุณคือร่างบันทึกข้อความและหนังสือราชการให้มีความถูกต้องตามระเบียบสารบรรณ 100% ภาษาเป็นทางการ ไพเราะ และกระชับ`;

  return await callGeminiApi(prompt, systemInstruction, apiKey, model);
}

// 4. AI Draft Reply Official Memo (หนังสือตอบกลับ / หนังสือส่งกลับ จากไฟล์ที่ส่งมา)
export interface ReplyMemoInput {
  incomingPdfText: string;
  replyIntent: string;
  department: string;
  senderName: string;
  senderPosition: string;
  attachments?: string;
}

export async function draftReplyMemo(
  input: ReplyMemoInput,
  apiKey: string,
  model = 'gemini-3.5-flash'
): Promise<string> {
  const prompt = `จากเอกสารหนังสือราชการต้นเรื่องที่ได้รับ (หนังสือเข้า / หนังสือส่งมา) ต่อไปนี้:
"""
${input.incomingPdfText.slice(0, 30000)}
"""

ข้อมูลความประสงค์ในการทำ "หนังสือตอบกลับ / หนังสือส่งกลับ":
- ส่วนราชการผู้ตอบ: ${input.department || 'โรงเรียน...'}
- ผู้ลงนาม/ผู้เสนอ: ${input.senderName || 'นาย/นาง...'} (${input.senderPosition || 'ผู้อำนวยการโรงเรียน...'})
- ประเด็น/สาระสำคัญที่ต้องการตอบกลับ: ${input.replyIntent}
- สิ่งที่ส่งมาด้วย (ถ้ามี): ${input.attachments || '-'}

คำแนะนำในการร่างหนังสือตอบกลับตามระเบียบสารบรรณ 100%:
1. ตรวจสอบและสกัดข้อมูลจากหนังสือต้นเรื่อง:
   - สกัด "อ้างถึง": เช่น หนังสือ[ชื่อหน่วยงานต้นเรื่อง] ที่ [เลขที่หนังสือ] ลงวันที่ [วันที่]
   - กำหนด "เรื่อง": ให้สอดคล้องกับเรื่องที่ส่งมา เช่น "แจ้งผลการ...", "ตอบรับการเข้าร่วม...", "ส่งรายชื่อ..."
   - กำหนด "เรียน": ตำแหน่งผู้ส่งหนังสือต้นเรื่อง (เช่น ผู้อำนวยการสำนักงานเขตพื้นที่การศึกษา...)
2. โครงสร้างเนื้อหา 3 ตอนมาตรฐานหนังสือราชการตอบกลับ:
   - ย่อหน้า 1 (อ้างถึงต้นเรื่อง): "ตามหนังสือที่อ้างถึง [ชื่อหน่วยงานต้นเรื่อง] ได้แจ้ง/ขอความอนุเคราะห์... ความละเอียดแจ้งแล้ว นั้น"
   - ย่อหน้า 2 (ข้อเท็จจริง/ผลการดำเนินการตอบกลับ): "ในการนี้ โรงเรียน[ชื่อโรงเรียน] ขอเรียนว่า [เรียบเรียงประเด็นตอบกลับอย่างเป็นทางการ สละสลวย ชัดเจน พร้อมระบุรายละเอียด/รายชื่อ/สิ่งที่ส่งมาด้วย]"
   - ย่อหน้า 3 (คำลงท้ายข้อเสนอ): "จึงเรียนมาเพื่อโปรดทราบ / จึงเรียนมาเพื่อโปรดพิจารณา"
3. จัดรูปแบบตามแบบฟอร์มหนังสือราชการไทย (ส่วนราชการ, ที่, วันที่, เรื่อง, เรียน, อ้างถึง, สิ่งที่ส่งมาด้วย, เนื้อหา, คำลงท้าย)`;

  const systemInstruction = `คุณคือนักจัดการงานสารบรรณชำนาญการพิเศษ ผู้เชี่ยวชาญการร่างหนังสือราชการตอบกลับและหนังสือส่งกลับของกระทรวงศึกษาธิการและหน่วยงานราชการไทย ใช้ภาษาทางการ ถูกต้องตามระเบียบสารบรรณ 100%`;

  return await callGeminiApi(prompt, systemInstruction, apiKey, model);
}

// Export Official Memo to Word .docx with Sarabun formatting
export async function exportMemoToDocx(memoText: string, filename: string): Promise<void> {
  const lines = memoText.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      continue;
    }

    if (trimmed.startsWith('#') || trimmed.includes('บันทึกข้อความ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace(/#/g, '').trim(),
              bold: true,
              size: 32, // 16pt
              font: 'TH Sarabun PSK',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
              size: 32, // 16pt
              font: 'TH Sarabun PSK',
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }
  }

  const doc = new Document({
    title: filename,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

// Test Connection
export async function testGeminiConnection(apiKey: string, model: string): Promise<boolean> {
  try {
    const res = await callGeminiApi('ตอบสั้นๆ ว่า "เชื่อมต่อสำเร็จ"', undefined, apiKey, model);
    return res.length > 0;
  } catch (e) {
    return false;
  }
}
