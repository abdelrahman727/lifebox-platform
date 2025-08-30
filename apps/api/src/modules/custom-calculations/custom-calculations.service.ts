import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as math from 'mathjs';
import { 
  CreateCalculationFormulaDto, 
  UpdateCalculationFormulaDto,
  TestFormulaDto,
  CalculationFormulaFilterDto,
  CalculateResultDto
} from './dto/custom-calculations.dto';

interface FormulaVariable {
  name: string;
  displayName: string;
  sourceType: 'telemetry' | 'unknown_field' | 'constant';
  sourceField: string;
  unit: string;
  isRequired: boolean;
  defaultValue?: number;
}

interface FormulaConstants {
  [key: string]: {
    value: number;
    unit: string;
    description: string;
  };
}

@Injectable()
export class CustomCalculationsService {
  private readonly logger = new Logger(CustomCalculationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createFormula(createDto: CreateCalculationFormulaDto, userId: string) {
    this.logger.log(`Creating calculation formula: ${createDto.name}`);

    // Validate formula syntax
    await this.validateFormula(createDto.formula, createDto.variables, createDto.constants);

    return await this.prisma.calculationFormula.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        formula: createDto.formula,
        variables: createDto.variables as any,
        constants: createDto.constants as any,
        resultUnit: createDto.resultUnit,
        category: createDto.category,
        isActive: createDto.isActive ?? true,
        createdBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  async findAllFormulas(filterDto?: CalculationFormulaFilterDto) {
    const where: any = {};

    if (filterDto?.category) {
      where.category = filterDto.category;
    }

    if (filterDto?.isActive !== undefined) {
      where.isActive = filterDto.isActive;
    }

    if (filterDto?.search) {
      where.OR = [
        { name: { contains: filterDto.search, mode: 'insensitive' } },
        { description: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.calculationFormula.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            calculationResults: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: filterDto?.limit || 50,
      skip: filterDto?.offset || 0,
    });
  }

  async findOneFormula(id: string) {
    const formula = await this.prisma.calculationFormula.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            calculationResults: true,
          },
        },
      },
    });

    if (!formula) {
      throw new NotFoundException(`Calculation formula with ID ${id} not found`);
    }

    return formula;
  }

  async updateFormula(id: string, updateDto: UpdateCalculationFormulaDto) {
    const existingFormula = await this.findOneFormula(id);

    // Validate formula if it's being updated
    if (updateDto.formula) {
      await this.validateFormula(
        updateDto.formula,
        updateDto.variables || existingFormula.variables,
        updateDto.constants || existingFormula.constants
      );
    }

    return await this.prisma.calculationFormula.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.description && { description: updateDto.description }),
        ...(updateDto.formula && { formula: updateDto.formula }),
        ...(updateDto.variables && { variables: updateDto.variables as any }),
        ...(updateDto.constants && { constants: updateDto.constants as any }),
        ...(updateDto.resultUnit && { resultUnit: updateDto.resultUnit }),
        ...(updateDto.category && { category: updateDto.category }),
        ...(updateDto.isActive !== undefined && { isActive: updateDto.isActive }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  async deactivateFormula(id: string) {
    const existingFormula = await this.findOneFormula(id);

    return await this.prisma.calculationFormula.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  async testFormula(testDto: TestFormulaDto) {
    try {
      const variables = testDto.variables as FormulaVariable[];
      const constants = testDto.constants as FormulaConstants;
      
      // Create scope with test values and constants
      const scope: any = {};
      
      // Add test values for variables
      for (const [varName, testValue] of Object.entries(testDto.testValues)) {
        scope[varName] = testValue;
      }
      
      // Add constants
      for (const [constName, constData] of Object.entries(constants)) {
        scope[constName] = constData.value;
      }

      // Evaluate the formula
      const result = math.evaluate(testDto.formula, scope);
      
      return {
        success: true,
        result,
        scope,
        formula: testDto.formula,
        resultUnit: testDto.resultUnit,
      };
    } catch (error) {
      this.logger.error(`Formula test failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        formula: testDto.formula,
      };
    }
  }

  async calculateForDevice(calculateDto: CalculateResultDto) {
    const formula = await this.findOneFormula(calculateDto.formulaId);
    const device = await this.prisma.device.findUnique({
      where: { id: calculateDto.deviceId },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${calculateDto.deviceId} not found`);
    }

    // Get telemetry data for the specified timestamp or latest
    let telemetryData;
    if (calculateDto.timestamp) {
      telemetryData = await this.getTelemetryForTimestamp(calculateDto.deviceId, new Date(calculateDto.timestamp));
    } else {
      telemetryData = await this.getLatestTelemetry(calculateDto.deviceId);
    }

    if (!telemetryData) {
      throw new NotFoundException('No telemetry data found for the specified device and timestamp');
    }

    // Extract variable values from telemetry and unknown fields
    const inputValues = await this.extractVariableValues(formula.variables, telemetryData);
    
    // Calculate result
    const calculationResult = await this.performCalculation(
      formula.formula,
      formula.variables,
      formula.constants,
      inputValues
    );

    // Store the result
    const timestamp = calculateDto.timestamp ? new Date(calculateDto.timestamp) : new Date();
    const storedResult = await this.prisma.calculationResult.upsert({
      where: {
        deviceId_formulaId_timestamp: {
          deviceId: calculateDto.deviceId,
          formulaId: calculateDto.formulaId,
          timestamp,
        },
      },
      update: {
        result: calculationResult.result,
        inputValues: calculationResult.inputValues,
        isValid: calculationResult.success,
        errorMessage: calculationResult.error || null,
      },
      create: {
        deviceId: calculateDto.deviceId,
        formulaId: calculateDto.formulaId,
        timestamp,
        result: calculationResult.result || 0,
        inputValues: calculationResult.inputValues,
        isValid: calculationResult.success,
        errorMessage: calculationResult.error || null,
      },
      include: {
        formula: {
          select: {
            name: true,
            resultUnit: true,
            category: true,
          },
        },
        device: {
          select: {
            deviceName: true,
            deviceCode: true,
          },
        },
      },
    });

    return storedResult;
  }

  async getCalculationResults(deviceId: string, formulaId?: string, startDate?: Date, endDate?: Date) {
    const where: any = { deviceId };

    if (formulaId) {
      where.formulaId = formulaId;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    return await this.prisma.calculationResult.findMany({
      where,
      include: {
        formula: {
          select: {
            name: true,
            resultUnit: true,
            category: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 500, // Limit to prevent large responses
    });
  }

  async getAvailableFields() {
    // Get telemetry fields from TelemetryEvent model
    const telemetryFields = [
      { name: 'totalEnergyValue', displayName: 'Total Energy', unit: 'MWh', type: 'telemetry' },
      { name: 'energyPerDayValue', displayName: 'Daily Energy', unit: 'kWh', type: 'telemetry' },
      { name: 'busVoltageValue', displayName: 'Bus Voltage', unit: 'V', type: 'telemetry' },
      { name: 'pumpPowerValue', displayName: 'Pump Power', unit: 'kW', type: 'telemetry' },
      { name: 'pumpVoltageValue', displayName: 'Pump Voltage', unit: 'V', type: 'telemetry' },
      { name: 'pumpCurrentValue', displayName: 'Pump Current', unit: 'A', type: 'telemetry' },
      { name: 'motorSpeedValue', displayName: 'Motor RPM', unit: 'RPM', type: 'telemetry' },
      { name: 'pumpEnergyConsumptionValue', displayName: 'Pump Energy', unit: 'kWh', type: 'telemetry' },
      { name: 'frequencyValue', displayName: 'Frequency', unit: 'Hz', type: 'telemetry' },
      { name: 'inverterTemperatureValue', displayName: 'Inverter Temperature', unit: '°C', type: 'telemetry' },
      { name: 'tdsValue', displayName: 'TDS', unit: 'ppm', type: 'telemetry' },
      { name: 'levelSensorValue', displayName: 'Water Level', unit: 'm', type: 'telemetry' },
      { name: 'pressureSensorValue', displayName: 'Pressure', unit: 'bar', type: 'telemetry' },
      { name: 'ph', displayName: 'pH Level', unit: 'pH', type: 'telemetry' },
      { name: 'soilMoisturePct', displayName: 'Soil Moisture', unit: '%', type: 'telemetry' },
      { name: 'totalWaterVolumeM3Value', displayName: 'Water Volume', unit: 'm³', type: 'telemetry' },
    ];

    // Get unknown fields from catalog
    const unknownFields = await this.prisma.unknownFieldCatalog.findMany({
      where: { promoted: true },
      select: {
        fieldName: true,
        sampleValues: true,
      },
    });

    const unknownFieldsMapped = unknownFields.map(field => ({
      name: field.fieldName,
      displayName: field.fieldName,
      unit: 'unknown',
      type: 'unknown_field',
      sampleValues: field.sampleValues,
    }));

    return {
      telemetryFields,
      unknownFields: unknownFieldsMapped,
    };
  }

  private async validateFormula(formula: string, variables: any, constants: any) {
    try {
      // Create a test scope with dummy values
      const scope: any = {};
      
      // Add variables with test values
      const variableList = variables as FormulaVariable[];
      for (const variable of variableList) {
        scope[variable.name] = variable.defaultValue || 1;
      }
      
      // Add constants
      const constantsMap = constants as FormulaConstants;
      for (const [constName, constData] of Object.entries(constantsMap)) {
        scope[constName] = constData.value;
      }

      // Try to evaluate the formula
      math.evaluate(formula, scope);
      
      this.logger.log(`Formula validation passed: ${formula}`);
      return true;
    } catch (error) {
      this.logger.error(`Formula validation failed: ${error.message}`);
      throw new BadRequestException(`Invalid formula: ${error.message}`);
    }
  }

  private async getTelemetryForTimestamp(deviceId: string, timestamp: Date) {
    // Find telemetry closest to the specified timestamp
    return await this.prisma.telemetryEvent.findFirst({
      where: {
        deviceId,
        time: {
          lte: timestamp,
        },
      },
      orderBy: {
        time: 'desc',
      },
    });
  }

  private async getLatestTelemetry(deviceId: string) {
    return await this.prisma.telemetryEvent.findFirst({
      where: { deviceId },
      orderBy: { time: 'desc' },
    });
  }

  private async extractVariableValues(variables: any, telemetryData: any) {
    const inputValues: any = {};
    const variableList = variables as FormulaVariable[];
    
    for (const variable of variableList) {
      let value = null;
      
      if (variable.sourceType === 'telemetry') {
        value = telemetryData[variable.sourceField];
      } else if (variable.sourceType === 'unknown_field') {
        // Get from extras JSON field
        if (telemetryData.extras && telemetryData.extras[variable.sourceField]) {
          value = telemetryData.extras[variable.sourceField];
        }
      }
      
      // Use default value if no data found and variable is not required
      if (value === null || value === undefined) {
        if (variable.isRequired) {
          throw new BadRequestException(`Required variable ${variable.name} not found in telemetry data`);
        } else {
          value = variable.defaultValue || 0;
        }
      }
      
      inputValues[variable.name] = value;
    }
    
    return inputValues;
  }

  private async performCalculation(
    formula: string,
    variables: any,
    constants: any,
    inputValues: any
  ) {
    try {
      const scope: any = { ...inputValues };
      
      // Add constants to scope
      const constantsMap = constants as FormulaConstants;
      for (const [constName, constData] of Object.entries(constantsMap)) {
        scope[constName] = constData.value;
      }
      
      const result = math.evaluate(formula, scope);
      
      return {
        success: true,
        result: parseFloat(result.toString()),
        inputValues,
      };
    } catch (error) {
      this.logger.error(`Calculation failed: ${error.message}`);
      return {
        success: false,
        result: null,
        inputValues,
        error: error.message,
      };
    }
  }
}