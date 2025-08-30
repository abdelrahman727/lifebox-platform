/**
 * Calculation Engine for Quick View Custom Calculations
 * 
 * This engine handles:
 * 1. Formula parsing and validation
 * 2. Variable resolution from device telemetry data
 * 3. Mathematical expression evaluation
 * 4. Error handling and type safety
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export interface CalculationVariable {
  variableName: string;
  deviceId: string;
  fieldName: string;
  aggregation: 'latest' | 'avg' | 'sum' | 'min' | 'max' | 'count';
  timeWindow?: number; // minutes
}

export interface CalculationContext {
  variables: Record<string, number>;
  deviceData: Record<string, any>;
  filteredData?: Record<string, any[]>;
}

export interface CalculationResult {
  value: number;
  error?: string;
  variables: Record<string, number>;
  executionTime: number;
}

@Injectable()
export class CalculationEngine {
  private readonly logger = new Logger(CalculationEngine.name);

  /**
   * Validate a mathematical formula
   */
  validateFormula(formula: string, variables: CalculationVariable[]): void {
    // Remove whitespace for easier parsing
    const cleanFormula = formula.replace(/\s+/g, '');
    
    // Check for valid characters (numbers, operators, parentheses, variable names)
    const validPattern = /^[a-zA-Z0-9_+\-*/().]+$/;
    if (!validPattern.test(cleanFormula)) {
      throw new BadRequestException('Formula contains invalid characters');
    }

    // Check for balanced parentheses
    let parenthesesCount = 0;
    for (const char of cleanFormula) {
      if (char === '(') parenthesesCount++;
      if (char === ')') parenthesesCount--;
      if (parenthesesCount < 0) {
        throw new BadRequestException('Unmatched closing parenthesis');
      }
    }
    if (parenthesesCount !== 0) {
      throw new BadRequestException('Unmatched opening parenthesis');
    }

    // Extract variable references from formula
    const variableReferences = this.extractVariableReferences(formula);
    const variableNames = variables.map(v => v.variableName);

    // Check that all referenced variables are defined
    const undefinedVariables = variableReferences.filter(ref => !variableNames.includes(ref));
    if (undefinedVariables.length > 0) {
      throw new BadRequestException(`Undefined variables in formula: ${undefinedVariables.join(', ')}`);
    }

    // Check that all defined variables are used
    const unusedVariables = variableNames.filter(name => !variableReferences.includes(name));
    if (unusedVariables.length > 0) {
      this.logger.warn(`Unused variables defined: ${unusedVariables.join(', ')}`);
    }
  }

  /**
   * Extract variable references from formula (e.g., device_1, pump_a)
   */
  private extractVariableReferences(formula: string): string[] {
    const variablePattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    const matches = formula.match(variablePattern) || [];
    
    // Filter out common mathematical functions and constants
    const mathKeywords = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'abs', 'floor', 'ceil', 'round', 'pow', 'exp', 'pi', 'e']);
    
    return [...new Set(matches.filter(match => !mathKeywords.has(match.toLowerCase())))];
  }

  /**
   * Execute a calculation with given context
   */
  async executeCalculation(
    formula: string,
    variables: CalculationVariable[],
    context: CalculationContext
  ): Promise<CalculationResult> {
    const startTime = Date.now();

    try {
      // Validate the formula first
      this.validateFormula(formula, variables);

      // Resolve variable values from context
      const resolvedVariables = await this.resolveVariables(variables, context);

      // Execute the calculation
      const result = this.evaluateExpression(formula, resolvedVariables);

      // Check for valid result
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Calculation resulted in invalid number');
      }

      const executionTime = Date.now() - startTime;

      return {
        value: result,
        variables: resolvedVariables,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Calculation error: ${error.message}`, error.stack);

      return {
        value: 0,
        error: error.message,
        variables: {},
        executionTime
      };
    }
  }

  /**
   * Resolve variable values from telemetry data
   */
  private async resolveVariables(
    variables: CalculationVariable[],
    context: CalculationContext
  ): Promise<Record<string, number>> {
    const resolved: Record<string, number> = {};

    for (const variable of variables) {
      try {
        const value = await this.resolveVariable(variable, context);
        resolved[variable.variableName] = value;
      } catch (error) {
        this.logger.warn(`Failed to resolve variable ${variable.variableName}: ${error.message}`);
        resolved[variable.variableName] = 0; // Default to 0 for missing data
      }
    }

    return resolved;
  }

  /**
   * Resolve a single variable value
   */
  private async resolveVariable(
    variable: CalculationVariable,
    context: CalculationContext
  ): Promise<number> {
    // If value already resolved in context, use it
    if (context.variables && variable.variableName in context.variables) {
      return context.variables[variable.variableName];
    }

    // Get device data
    const deviceData = context.deviceData[variable.deviceId];
    if (!deviceData) {
      throw new Error(`No data available for device ${variable.deviceId}`);
    }

    // Use filtered data if available
    const dataToUse = context.filteredData?.[variable.deviceId] || [deviceData];

    // Apply aggregation
    return this.applyAggregation(dataToUse, variable.fieldName, variable.aggregation, variable.timeWindow);
  }

  /**
   * Apply aggregation function to data
   */
  private applyAggregation(
    data: any[],
    fieldName: string,
    aggregation: string,
    timeWindow?: number
  ): number {
    if (!data || data.length === 0) {
      return 0;
    }

    // Filter by time window if specified
    let filteredData = data;
    if (timeWindow) {
      const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000);
      filteredData = data.filter(record => new Date(record.time) >= cutoffTime);
    }

    if (filteredData.length === 0) {
      return 0;
    }

    // Extract field values
    const values = filteredData
      .map(record => {
        const value = this.getNestedField(record, fieldName);
        return typeof value === 'number' ? value : parseFloat(value);
      })
      .filter(value => !isNaN(value));

    if (values.length === 0) {
      return 0;
    }

    // Apply aggregation
    switch (aggregation) {
      case 'latest':
        return values[values.length - 1]; // Last value
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        throw new Error(`Unknown aggregation type: ${aggregation}`);
    }
  }

  /**
   * Get nested field from object (supports dot notation like "pump.power")
   */
  private getNestedField(obj: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((current, field) => current?.[field], obj);
  }

  /**
   * Safely evaluate mathematical expression
   */
  private evaluateExpression(formula: string, variables: Record<string, number>): number {
    // Replace variables with their values
    let expression = formula;
    for (const [varName, value] of Object.entries(variables)) {
      // Use word boundaries to avoid partial replacements
      const regex = new RegExp(`\\b${varName}\\b`, 'g');
      expression = expression.replace(regex, value.toString());
    }

    // Add support for common mathematical functions
    expression = expression
      .replace(/\bsqrt\(/g, 'Math.sqrt(')
      .replace(/\babs\(/g, 'Math.abs(')
      .replace(/\bfloor\(/g, 'Math.floor(')
      .replace(/\bceil\(/g, 'Math.ceil(')
      .replace(/\bround\(/g, 'Math.round(')
      .replace(/\bpow\(/g, 'Math.pow(')
      .replace(/\bexp\(/g, 'Math.exp(')
      .replace(/\bln\(/g, 'Math.log(')
      .replace(/\blog\(/g, 'Math.log10(')
      .replace(/\bsin\(/g, 'Math.sin(')
      .replace(/\bcos\(/g, 'Math.cos(')
      .replace(/\btan\(/g, 'Math.tan(')
      .replace(/\bpi\b/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E');

    // Validate the final expression contains only safe characters
    const safePattern = /^[0-9+\-*/().Math\s]+$/;
    if (!safePattern.test(expression.replace(/Math\.[A-Za-z]+/g, 'M'))) {
      throw new Error('Expression contains unsafe characters after variable substitution');
    }

    try {
      // Use Function constructor instead of eval for better security
      const result = new Function(`"use strict"; return (${expression})`)();
      
      if (typeof result !== 'number') {
        throw new Error('Expression did not evaluate to a number');
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${error.message}`);
    }
  }

  /**
   * Format calculation result for display
   */
  formatResult(
    value: number,
    format: 'number' | 'percentage' | 'currency',
    decimalPlaces: number,
    unit?: string
  ): string {
    if (!isFinite(value)) {
      return 'N/A';
    }

    let formatted: string;

    switch (format) {
      case 'percentage':
        formatted = `${(value * 100).toFixed(decimalPlaces)}%`;
        break;
      case 'currency':
        formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces
        }).format(value);
        break;
      default:
        formatted = value.toFixed(decimalPlaces);
        if (unit) {
          formatted += ` ${unit}`;
        }
        break;
    }

    return formatted;
  }

  /**
   * Test calculation with sample data
   */
  async testCalculation(
    formula: string,
    variables: CalculationVariable[],
    sampleData: Record<string, any>
  ): Promise<CalculationResult> {
    const context: CalculationContext = {
      variables: {},
      deviceData: sampleData
    };

    return this.executeCalculation(formula, variables, context);
  }
}