import { Router, type IRouter } from "express";
import { getSupabase } from "../lib/supabase";

const router: IRouter = Router();

router.post("/extract-pdf", async (req, res): Promise<void> => {
  const { storagePath, docId } = req.body;
  if (!storagePath || !docId) {
    res.status(400).json({ error: "storagePath and docId are required" });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("student-notes")
      .download(storagePath);

    if (downloadError || !fileData) {
      req.log.error({ downloadError }, "Failed to download file from Supabase Storage");
      res.status(500).json({ error: "Failed to download file from storage" });
      return;
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    if (storagePath.toLowerCase().endsWith(".pdf")) {
      try {
        const pdfParse = await import("pdf-parse");
        const pdfData = await pdfParse.default(buffer);
        extractedText = pdfData.text;
      } catch (pdfErr) {
        req.log.error({ pdfErr }, "Failed to parse PDF");
        res.status(500).json({ error: "Failed to extract text from PDF" });
        return;
      }
    } else {
      extractedText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
    }

    const { error: updateError } = await supabase
      .from("uploaded_docs")
      .update({ extracted_text: extractedText, processed: true })
      .eq("id", docId);

    if (updateError) {
      req.log.error({ updateError }, "Failed to update doc with extracted text");
    }

    res.json({ text: extractedText, docId });
  } catch (err) {
    req.log.error({ err }, "PDF extraction error");
    res.status(500).json({ error: "Failed to process document" });
  }
});

export default router;
