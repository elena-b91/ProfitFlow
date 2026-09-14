package org.example.profitflow.Model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "recipe_ingredients")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "menuItem_id", nullable = false)
    @JsonBackReference
    private MenuItem menuItem;

    @ManyToOne
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @Column(nullable = false, precision = 10, scale = 3)
    private BigDecimal quantityNeeded; // ex: 0.150 pentru 150g de carne

    /**
     * Calculează costul în timp real când obiectul este serializat în JSON pentru frontend.
     * `@Transient` asigură că Hibernate ignoră complet acest câmp la nivel de bază de date.
     */
    @Transient
    public BigDecimal getCalculatedCost() {
        if (this.ingredient != null && this.ingredient.getPricePerUnit() != null && this.quantityNeeded != null) {
            return this.ingredient.getPricePerUnit()
                    .multiply(this.quantityNeeded)
                    .setScale(2, java.math.RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO;
    }
}