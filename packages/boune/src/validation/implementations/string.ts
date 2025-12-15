import type { StringValidator, ValidationRule } from "../types.ts";
import { ValidatorBuilder, type ValidatorFactory } from "../builder.ts";
import { stringRules } from "../rules/index.ts";

/**
 * String validator - methods delegate to rule specs
 */
export class StringValidatorImpl
  extends ValidatorBuilder<string, StringValidator>
  implements StringValidator
{
  constructor(
    factory: ValidatorFactory<string, StringValidator>,
    rules: ValidationRule<string>[] = [],
  ) {
    super(factory, rules);
  }

  email(message?: string): StringValidator {
    return this.applyRule(stringRules.email, [], message);
  }

  url(message?: string): StringValidator {
    return this.applyRule(stringRules.url, [], message);
  }

  regex(pattern: RegExp, message?: string): StringValidator {
    return this.applyRule(stringRules.regex, [pattern], message);
  }

  minLength(min: number, message?: string): StringValidator {
    return this.applyRule(stringRules.minLength, [min], message);
  }

  maxLength(max: number, message?: string): StringValidator {
    return this.applyRule(stringRules.maxLength, [max], message);
  }

  oneOf<V extends string>(values: readonly V[], message?: string): StringValidator {
    return this.applyRule(stringRules.oneOf, [values], message);
  }

  refine(rule: ValidationRule<string>, message?: string): StringValidator {
    return this.applyRefine(rule, message);
  }
}
