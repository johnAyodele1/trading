import { FeatureWeights } from '../types';

export class ProbabilisticModel {
  private coefficients: FeatureWeights = {};
  private bias: number = 0;
  private learningRate: number = 0.05;

  constructor(features: string[]) {
    features.forEach(f => {
      this.coefficients[f] = 0.01; // Small non-zero initialization
    });
  }

  predict(features: Record<string, any>): number {
    let logit = this.bias;
    for (const [f, weight] of Object.entries(this.coefficients)) {
      const val = Number(features[f]);
      if (!isNaN(val)) {
        logit += val * weight;
      }
    }
    return 1 / (1 + Math.exp(-logit));
  }

  train(features: Record<string, any>, outcome: number) {
    const prediction = this.predict(features);
    const error = outcome - prediction;

    for (const f of Object.keys(this.coefficients)) {
      const val = Number(features[f]);
      if (!isNaN(val)) {
        this.coefficients[f] += this.learningRate * error * val;
      }
    }
    this.bias += this.learningRate * error;
  }

  getCoefficients(): FeatureWeights {
    return { ...this.coefficients };
  }
}
