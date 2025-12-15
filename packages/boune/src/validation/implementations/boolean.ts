import type { BooleanValidator, ValidationRule } from "../types.ts";
import { ValidatorBuilder, type ValidatorFactory } from "../builder.ts";

/**
 * Boolean validator - only has refine method
 */
export class BooleanValidatorImpl
  extends ValidatorBuilder<boolean, BooleanValidator>
  implements BooleanValidator
{
  constructor(
    factory: ValidatorFactory<boolean, BooleanValidator>,
    rules: ValidationRule<boolean>[] = [],
  ) {
    super(factory, rules);
  }

  refine(rule: ValidationRule<boolean>, message?: string): BooleanValidator {
    return this.applyRefine(rule, message);
  }
}
