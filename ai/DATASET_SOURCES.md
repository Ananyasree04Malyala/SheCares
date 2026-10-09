# SheCares AI — Dataset Sources & Provenance Registry

This registry documents the datasets, annotations, and domain knowledge bases utilized in the custom SheCares AI subsystems: the **SheCares AI Yoga Pose & Alignment Engine** and the **SheCares Clinical Health AI Engine**.

---

## 1. AI Yoga Pose Datasets

### A. Yoga-82 Dataset
- **Origin**: Verma et al., *"Yoga-82: A New Dataset for Fine-grained Action Recognition"*, CVPR Workshops 2020.
- **Repository / Source**: [https://github.com/verma-vikram/Yoga-82](https://github.com/verma-vikram/Yoga-82)
- **Dataset Structure**: 82 fine-grained yoga poses across 6 parent categories (Standing, Sitting, Balancing, Inverted, Reclining, Wheel).
- **License**: Research & Educational Use.
- **Usage in SheCares**: Ground-truth pose labels, topological hierarchies, and validation benchmarks for MediaPipe 33-landmark pose classification.

### B. Kaggle Yoga Pose Classification Dataset
- **Origin**: Public domain dataset compiled by Shruti Saxena & community contributors.
- **Dataset Content**: Curated images across core foundational yoga poses (including Tadasana, Vrikshasana, Virabhadrasana II, Trikonasana, Bhujangasana, Balasana, Utkatasana, Baddha Konasana).
- **License**: CC BY-SA 4.0.
- **Usage in SheCares**: Supplementary multi-angle training and cross-validation of 33-landmark 3D coordinate normalization.

### C. SheCares Biomechanical Reference Dataset
- **Origin**: SheCares In-House Studio 3D & Anatomical Yoga Library (`assets/yoga3d/`, `js/yoga/YogaPoseLibrary.js`).
- **Content**: 41 clinically vetted yoga poses with 33-point biomechanical joint-angle vectors (degrees, tolerance bands, primary anchor joints, secondary alignment checks).
- **License**: Proprietary / SheCares Internal Open Healthcare License.
- **Usage in SheCares**: Real-time form scoring, joint angle grading, and instant audio/visual corrective feedback.

---

## 2. SheCares Women's Health Clinical Knowledge Base

The internal Health AI retrieval engine replaces external proprietary diagnostic APIs with an evidence-based clinical database grounded in peer-reviewed clinical guidelines:

1. **Menstrual & Hormonal Health (`ai/knowledge/menstrual.json`)**:
   - Sources: ACOG Practice Bulletins (Dysmenorrhea, Abnormal Uterine Bleeding, PCOS), Endocrine Society Clinical Guidelines.
2. **Obstetrics & Maternal Care (`ai/knowledge/pregnancy.json`)**:
   - Sources: ACOG Prenatal Care Standards, WHO Recommendations on Antenatal Care, ICMR Guidelines for High-Risk Pregnancy.
3. **Cardiometabolic & Diabetic Health (`ai/knowledge/diabetes.json`)**:
   - Sources: ADA Standards of Medical Care in Diabetes, RSSDI Clinical Practice Recommendations, AHA/ACC Hypertension Guidelines.
4. **Mental & Emotional Wellness (`ai/knowledge/mental_health.json`)**:
   - Sources: NICE Guidelines (Perinatal Mental Health, GAD), DSM-5 Triage Criteria, PHQ-9 & GAD-7 assessment protocols.
5. **Nutrition & Lifestyle (`ai/knowledge/nutrition.json`)**:
   - Sources: ICMR-NIN Dietary Guidelines for Indians, WHO Healthy Diet Fact Sheets.
6. **Emergency Triage & Red-Flag Escalation (`ai/knowledge/emergency.json`)**:
   - Sources: Emergency Medicine Red-Flag Criteria, AHA Stroke / Myocardial Infarction Warnings, Obstetric Hemorrhage / Eclampsia Protocols.
   - National Emergency Escalation: **112** (India National Emergency Number).
