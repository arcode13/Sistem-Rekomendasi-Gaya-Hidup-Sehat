import os
import pickle
from typing import Dict, Any, Optional
import numpy as np
from loguru import logger

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")


class HealthPredictionService:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.features = None
        self._load_models()

    def _load_models(self):
        try:
            model_path = os.path.join(MODELS_DIR, "xgboost_model.pkl")
            scaler_path = os.path.join(MODELS_DIR, "scaler.pkl")
            features_path = os.path.join(MODELS_DIR, "feature_names.pkl")

            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found: {model_path}")
            if not os.path.exists(scaler_path):
                raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
            if not os.path.exists(features_path):
                raise FileNotFoundError(f"Features file not found: {features_path}")

            with open(model_path, "rb") as f:
                self.model = pickle.load(f)
            with open(scaler_path, "rb") as f:
                self.scaler = pickle.load(f)
            with open(features_path, "rb") as f:
                self.features = pickle.load(f)

            logger.info("Health prediction models loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load health prediction models: {str(e)}")
            raise

    def validate_input(
        self,
        age: int,
        gender: int,
        height: float,
        weight: float,
        systolic_bp: int,
        diastolic_bp: int,
    ) -> None:
        if not (20 <= age <= 70):
            raise ValueError("Age must be between 20 and 70 years")
        if gender not in [1, 2]:
            raise ValueError("Gender must be 1 (Female) or 2 (Male)")
        if not (140 <= height <= 220):
            raise ValueError("Height must be between 140 and 220 cm")
        if not (40 <= weight <= 200):
            raise ValueError("Weight must be between 40 and 200 kg")
        if not (60 <= systolic_bp <= 250):
            raise ValueError("Systolic blood pressure must be between 60 and 250 mmHg")
        if not (40 <= diastolic_bp <= 200):
            raise ValueError("Diastolic blood pressure must be between 40 and 200 mmHg")
        if systolic_bp <= diastolic_bp:
            raise ValueError("Systolic blood pressure must be greater than diastolic")

    def predict(
        self,
        age: int,
        gender: int,
        height: float,
        weight: float,
        systolic_bp: int,
        diastolic_bp: int,
        cholesterol: Optional[int] = None,
        glucose: Optional[int] = None,
        smoking: Optional[int] = None,
        alcohol: Optional[int] = None,
        physical_activity: Optional[int] = None,
    ) -> Dict[str, Any]:
        self.validate_input(age, gender, height, weight, systolic_bp, diastolic_bp)

        bmi = round(weight / ((height / 100) ** 2), 2)
        pulse_pressure = systolic_bp - diastolic_bp

        if self.features is not None:
            feature_dict = {
                'age': age,
                'gender': gender,
                'height': height,
                'weight': weight,
                'bmi': bmi,
                'systolic_bp': systolic_bp,
                'diastolic_bp': diastolic_bp,
                'pulse_pressure': pulse_pressure,
                'cholesterol': cholesterol if cholesterol is not None else 1,
                'glucose': glucose if glucose is not None else 1,
                'smoking': smoking if smoking is not None else 0,
                'alcohol': alcohol if alcohol is not None else 0,
                'physical_activity': physical_activity if physical_activity is not None else 0,
            }
            data = np.array([[feature_dict.get(feat, 0) for feat in self.features]])
        else:
            data = np.array(
                [[age, gender, height, weight, bmi, systolic_bp, diastolic_bp, pulse_pressure]]
            )

        data_scaled = self.scaler.transform(data)
        prediction = self.model.predict(data_scaled)[0]
        probabilities = self.model.predict_proba(data_scaled)[0]

        prob_disease = float(probabilities[1])
        prob_no_disease = float(probabilities[0])

        if prob_disease >= 0.7:
            risk_level = "high"
        elif prob_disease >= 0.3:
            risk_level = "medium"
        else:
            risk_level = "low"

        return {
            "prediction": int(prediction),
            "risk_level": risk_level,
            "confidence": round(float(max(probabilities)) * 100, 2),
            "probabilities": {
                "no_disease": round(float(prob_no_disease) * 100, 2),
                "disease": round(float(prob_disease) * 100, 2),
            },
            "bmi": float(bmi),
            "pulse_pressure": float(pulse_pressure),
        }


health_prediction_service = HealthPredictionService()

