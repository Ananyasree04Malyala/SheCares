# SheCares Clinical Health AI Engine

## 1. Domain Coverage
The SheCares Clinical Health AI Engine operates as an evidence-based clinical decision support and health guidance subsystem covering seven domains:
1. **Menstrual & Hormonal Care** (`ai/knowledge/menstrual.json`): Dysmenorrhea, cycle regularity, PCOS/PCOD screening, luteal phase management.
2. **Maternal & Pregnancy Health** (`ai/knowledge/pregnancy.json`): Trimester-by-trimester guidance, morning sickness management, gestational hypertension and preeclampsia awareness.
3. **Cardiometabolic & Diabetic Health** (`ai/knowledge/diabetes.json`): Glycemic ranges (ADA/RSSDI), Rule of 15 hypoglycemia protocol, blood pressure categorization (AHA/ACC).
4. **Mental & Emotional Wellness** (`ai/knowledge/mental_health.json`): Grounding techniques (4-7-8, 5-4-3-2-1), panic management, postpartum depression awareness (EPDS guidelines).
5. **Nutrition & Lifestyle** (`ai/knowledge/nutrition.json`): ICMR-NIN dietary balance, iron deficiency anemia prevention, low-GI meal structures.
6. **Fitness & Pelvic Floor** (`ai/knowledge/fitness.json`): Kegel exercises, pelvic floor conditioning, prenatal physical activity boundaries.
7. **Emergency Triage** (`ai/knowledge/emergency.json`): Critical red-flag triggers, immediate life-saving actions, and **112** emergency dispatch escalation.

## 2. Safety & Zero Hallucination Rules
- **No Fabricated Diagnoses**: Responses provide risk categorization and physiological explanations without diagnosing definitive medical conditions.
- **Biometric Grounding**: When queried about wearables or vitals, the assistant only cites values present in the patient's authenticated record.
- **Transparency on Missing Data**: Missing metrics receive a clear *"I don't currently have that health data available"* notice.
- **Emergency Escalation Code**: All acute queries feature direct referral to India's National Emergency Number (**112**) or the on-screen SheCares SOS button.
