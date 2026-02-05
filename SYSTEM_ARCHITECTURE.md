# System Architecture & Grading Logic

## 1. High-Level Overview
Refining the grading process, the system uses an AI Service (Google Gemini) to perform semantic answer similarity and section-wise evaluation, producing structured grading results.

## 2. Overall Data Flow
1. **Student Answer Paper** (PDF/Image)
2. **OCR Processing** (Text Extraction)
3. **Section-wise Answer Separation**
4. **Answer Key + Student Answers**
5. **AI Service** (Google Gemini)
6. **Section-wise Marks + Similarity**
7. **Final Result Display** (StartGrading.jsx)

## 3. Step-by-Step Internal Logic

### Step 1: Student Paper is Uploaded
- Student answer paper is uploaded by the teacher/admin.
- Paper metadata includes:
  - Subject
  - Total marks
  - Section-wise mark distribution

### Step 2: OCR Processing
- The system extracts text from the paper using OCR.
- Output is plain text.
- This step is AI-independent and offline.

### Step 3: Section-Wise Text Segmentation
- Extracted text is divided into Section A, Section B, etc.
- Mapping is done using section names configured during upload.

### Step 4: Answer Key Selection
- Teacher selects an answer key for the subject.
- Answer user represents section-wise correct answers.

## 4. Role of AI Service (Core Logic)

### What It Is
- Uses Google's Gemini Pro/Flash models via API.
- Replaces local Ollama instances for better reliability and performance.

### What It Does
- Compares student answers with answer key.
- Performs semantic similarity analysis.
- Evaluates completeness and relevance.
- Assigns section-wise marks.
- Generates short academic remarks.
- Calculates total marks, percentage, and grade.

## 5. Prompt Logic
- **Inputs**: Subject, Total Marks, Section Definitions, Answer Key, Student Answers.
- **Constraints**: 
  - Act as exam evaluator.
  - Return ONLY JSON.
  - No conversational text.

## 6. Processing Flow
For each section, the AI:
1. Compares student answer vs key.
2. Identifies overlaps/keywords.
3. Evaluates logical completeness.
4. Estimates similarity.
5. Assigns marks.
6. Generates remarks.

## 7. Final Calculation Logic
- Sum of section marks.
- Percentage calculation.
- Grade assignment.
- Pass/Fail determination.

## 8. Backend Safety Layer (Critical)
Even though AI generates marks, the Backend **MUST** enforce:
- Marks ≥ 0
- Marks ≤ section maximum
- Invalid/malformed responses rejected.
- JSON strictly parsed.

## 9. Frontend Integration
Frontend (`StartGrading.jsx`) sends request to `/api/grading/grade`, receives JSON, and evaluates nothing itself. It serves purely as a display layer.
