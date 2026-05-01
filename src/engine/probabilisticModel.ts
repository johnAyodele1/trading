import { FeatureWeights } from '../types';

export class ProbabilisticModel {
  private coefficients: FeatureWeights = {};
  private bias: number = 0;
  private initialLearningRate: number = 0.05;
  private decayRate: number = 0.001;
  private iteration: number = 0;

  constructor(features: string[]) {
    features.forEach(f => {
      this.coefficients[f] = 0.01;
    });
  }

  predict(features: Record<string, number | string | boolean | object>): number {
    let logit = this.bias;
    for (const [f, weight] of Object.entries(this.coefficients)) {
      const val = this.getFeatureValue(f, features);
      logit += val * weight;
    }
    return 1 / (1 + Math.exp(-logit));
  }

  private getFeatureValue(f: string, features: Record<string, any>): number {
    if (f === 'regime_TREND') return features.regime?.probabilities?.TREND || 0;
    if (f === 'regime_RANGE') return features.regime?.probabilities?.RANGE || 0;
    if (f === 'session_LONDON') return features.isLondonSession ? 1 : 0;
    if (f === 'session_NY') return features.isNYSession ? 1 : 0;

    const val = Number(features[f]);
    return isNaN(val) ? 0 : val;
  }

  train(features: Record<string, number | string | boolean | object>, outcome: number) {
    const prediction = this.predict(features);
    const error = outcome - prediction;

    const lr = this.initialLearningRate / (1 + this.decayRate * this.iteration);
    this.iteration++;

    for (const f of Object.keys(this.coefficients)) {
      const val = this.getFeatureValue(f, features);
      this.coefficients[f] += lr * error * val;
    }
    this.bias += lr * error;
  }

  saveState(): string {
    return JSON.stringify({
      coefficients: this.coefficients,
      bias: this.bias,
      iteration: this.iteration
    });
  }

  loadState(stateJson: string) {
    const state = JSON.parse(stateJson);
    this.coefficients = state.coefficients;
    this.bias = state.bias;
    this.iteration = state.iteration;
  }

  getCoefficients(): FeatureWeights {
    return { ...this.coefficients };
  }
}
