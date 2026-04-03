import { Router, type IRouter } from "express";
import healthRouter from "./health";
import groqRouter from "./groq";
import pdfRouter from "./pdf";

const router: IRouter = Router();

router.use(healthRouter);
router.use(groqRouter);
router.use(pdfRouter);

export default router;
