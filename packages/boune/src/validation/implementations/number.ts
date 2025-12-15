import type { NumberValidator, ValidationRule } from "../types.ts";
import { ValidatorBuilder, type ValidatorFactory } from "../builder.ts";
import { numberRules } from "../rules/index.ts";

/**
 * Number validator - methods delegate to rule specs
 */
export class NumberValidatorImpl
  extends ValidatorBuilder<number, NumberValidator>
  implements NumberValidator
{
  constructor(
    factory: ValidatorFactory<number, NumberValidator>,
    rules: ValidationRule<number>[] = [],
  ) {
    super(factory, rules);
  }

  min(minValue: number, message?: string): NumberValidator {
    return this.applyRule(numberRules.min, [minValue], message);
  }

  max(maxValue: number, message?: string): NumberValidator {
    return this.applyRule(numberRules.max, [maxValue], message);
  }

  integer(message?: string): NumberValidator {
    return this.applyRule(numberRules.integer, [], message);
  }

  positive(message?: string): NumberValidator {
    return this.applyRule(numberRules.positive, [], message);
  }

  negative(message?: string): NumberValidator {
    return this.applyRule(numberRules.negative, [], message);
  }

  oneOf<V extends number>(values: readonly V[], message?: string): NumberValidator {
    return this.applyRule(numberRules.oneOf, [values], message);
  }

  refine(rule: ValidationRule<number>, message?: string): NumberValidator {
    return this.applyRefine(rule, message);
  }
}
