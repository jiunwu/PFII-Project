# Lifetime Cost Calculation Methodology

## Overview
This document outlines the methodology for calculating the lifetime cost of products, specifically focusing on appliances like refrigerators. The lifetime cost includes not just the purchase price, but also operational costs, maintenance costs, and accounts for the time value of money through net present value calculations.

## Basic Formula
The basic lifetime cost of an appliance can be calculated as:

```
Lifetime Cost = Purchase Price + Energy Cost over Lifespan + Maintenance Costs
```

## Energy Cost Calculation
Energy cost over the lifespan of an appliance can be calculated using the following formula:

```
Energy Cost over Lifespan = Annual Energy Consumption (kWh) × Electricity Rate ($/kWh) × Appliance Lifespan (years)
```

Where:
- Annual Energy Consumption: Usually provided on the product's energy label or specifications
- Electricity Rate: The average cost per kilowatt-hour in the user's region
- Appliance Lifespan: The expected useful life of the appliance (e.g., 10 years for refrigerators)

## Maintenance Cost Estimation
Based on research, maintenance costs for appliances like refrigerators typically range from:
- Average repair cost: $200 to $500 per incident
- Expected number of repairs over lifetime: 1-3 for quality appliances

We can estimate maintenance costs as:
```
Estimated Maintenance Cost = Average Repair Cost × Expected Number of Repairs
```

## Net Present Value (NPV) Calculation
To account for the time value of money, we'll use NPV to discount future costs:

```
NPV = Initial Investment (Purchase Price) + Σ(Future Cash Flows / (1 + Discount Rate)^t)
```

Where:
- Future Cash Flows: Annual energy costs and estimated maintenance costs
- Discount Rate: Interest rate or inflation rate (user configurable)
- t: Time period (years)

For a refrigerator with a 10-year lifespan, the formula would be:

```
NPV = Purchase Price + Σ(Annual Energy Cost / (1 + r)^t) + Σ(Maintenance Cost in Year t / (1 + r)^t)
```

Where:
- r: Discount rate
- t: Year (1 to 10)

## Implementation Considerations
1. **User Inputs**:
   - Local electricity rate
   - Discount rate (default can be set to average inflation rate)
   - Expected appliance lifespan (defaults can be provided based on appliance type)

2. **Data Extraction from Product Pages**:
   - Purchase price
   - Energy efficiency rating
   - Annual energy consumption (kWh)

3. **Default Values**:
   - Refrigerator lifespan: 10 years
   - Average repair cost: $350
   - Number of repairs: 2 over lifetime
   - Default discount rate: 2% (typical inflation rate)

## Example Calculation
For a refrigerator with:
- Purchase price: €800
- Annual energy consumption: 300 kWh
- Electricity rate: €0.30/kWh
- Lifespan: 10 years
- Discount rate: 2%
- Estimated maintenance: €350 × 2 = €700 (spread over years 5 and 8)

The NPV calculation would be:
```
NPV = 800 + Σ(90 / (1.02)^t) + (350 / (1.02)^5) + (350 / (1.02)^8)
```

Where €90 is the annual energy cost (300 kWh × €0.30).

This approach provides a comprehensive view of the true cost of ownership, accounting for both operational costs and the time value of money.
