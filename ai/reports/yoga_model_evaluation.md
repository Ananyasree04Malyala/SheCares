# SheCares AI Yoga Pose Model Evaluation Report

**Model Architecture**: Biomechanical Multi-Feature Random Forest Classifier (120 Estimators, Depth 16)
**Feature Space**: 111 Biomechanical & Torso-Normalized Spatial Features from 33 MediaPipe Landmarks
**Classes Evaluated**: 41 Clinically Vetted Yoga Poses

## Metrics Summary
- **Overall Training Accuracy**: 95.71%
- **Overall Validation Accuracy**: 19.40%
- **Inference Latency Target**: < 15ms in browser (Real-time 60 FPS)

## Detailed Classification Metrics
```
                         precision    recall  f1-score   support

               tadasana       0.00      0.00      0.00        16
            vrikshasana       1.00      1.00      1.00        16
              sukhasana       0.05      0.06      0.05        16
               balasana       0.44      0.44      0.44        16
              vajrasana       0.11      0.12      0.12        16
           marjariasana       0.08      0.06      0.07        16
             bitilasana       0.00      0.00      0.00        16
   adho_mukha_svanasana       0.07      0.06      0.06        17
           bhujangasana       1.00      1.00      1.00        16
        setu_bandhasana       0.00      0.00      0.00        16
             makarasana       0.00      0.00      0.00        17
         pawanmuktasana       0.00      0.00      0.00        16
        virabhadrasana1       0.00      0.00      0.00        16
        virabhadrasana2       1.00      1.00      1.00        16
        virabhadrasana3       0.06      0.06      0.06        17
             utkatasana       1.00      1.00      1.00        16
            trikonasana       1.00      1.00      1.00        16
         parsvakonasana       0.00      0.00      0.00        16
      ardha_chandrasana       0.00      0.00      0.00        17
prasarita_padottanasana       0.00      0.00      0.00        16
              dandasana       0.05      0.06      0.05        17
      paschimottanasana       0.00      0.00      0.00        16
        baddha_konasana       1.00      1.00      1.00        17
   ardha_matsyendrasana       0.10      0.12      0.11        16
         janu_sirsasana       0.00      0.00      0.00        16
             garudasana       0.00      0.00      0.00        16
           natarajasana       0.00      0.00      0.00        16
               bakasana       0.00      0.00      0.00        16
           vasisthasana       0.15      0.12      0.13        17
              ustrasana       0.07      0.06      0.07        16
            dhanurasana       0.00      0.00      0.00        16
            salabhasana       0.00      0.00      0.00        16
             chakrasana       0.06      0.06      0.06        16
              sirsasana       0.00      0.00      0.00        17
           sarvangasana       0.00      0.00      0.00        16
               halasana       0.05      0.06      0.06        16
      pincha_mayurasana       0.00      0.00      0.00        16
   supta_matsyendrasana       0.07      0.06      0.07        16
        ananda_balasana       0.47      0.47      0.47        17
               savasana       0.10      0.12      0.11        16
              padmasana       0.00      0.00      0.00        16

               accuracy                           0.19       665
              macro avg       0.19      0.19      0.19       665
           weighted avg       0.19      0.19      0.19       665

```

## Production Deployment Notes
1. Model weights exported to `shecares_yoga_model.json` for zero-latency in-browser pose verification.
2. Temporal smoothing filter enabled with a 5-frame moving median to eliminate camera jitter.
3. Completely standalone; zero dependencies on AsanaAI or external paid yoga APIs.
