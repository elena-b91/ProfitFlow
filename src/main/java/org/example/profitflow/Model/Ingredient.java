package org.example.profitflow.Model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "ingredients")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "price_per_unit", nullable = false)
    private BigDecimal pricePerUnit;

    @Column(name = "unit_of_measurement", nullable = false)
    private String unitOfMeasurement; // e.g., "KG", "LITER", "PIECE"

    @Column(name = "purchased_quantity", nullable = false)
    private BigDecimal purchasedQuantity;

    @Column(name = "entrance_date", nullable = false)
    private LocalDate entranceDate;

    @Column(name = "real_exit_date")
    private LocalDate realExitDate; // Set when inStockQuantity reaches 0

    @Column(name = "predicted_exit_date")
    private LocalDate predictedExitDate; // Calculated dynamically via historical analysis

    @Column(name = "expiration_date")
    private LocalDate expirationDate; // Entrance date + USDA FoodKeeper shelf life days

    @Column(name = "waste_quantity", nullable = false)
    private BigDecimal wasteQuantity = BigDecimal.ZERO;

    @Column(name = "in_stock_quantity", nullable = false)
    private BigDecimal inStockQuantity;
}