package org.example.profitflow.Repository;

import org.example.profitflow.Model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    /**
     * Calculează de câte ori a fost comandat indirect un INGREDIENT în ultimele 30 de zile,
     * înmulțind cantitatea de preparate comandate cu gramajul/cantitatea din rețetă.
     */
    @Query("""
        SELECT COALESCE(SUM(oi.quantity * ri.quantityNeeded), 0)
        FROM Order o
        JOIN o.items oi
        JOIN oi.menuItem mi
        JOIN mi.recipeIngredients ri
        WHERE ri.ingredient.id = :ingredientId
        AND o.createdAt >= :sinceDate
    """)
    BigDecimal getTotalIngredientConsumptionSince(
            @Param("ingredientId") Long ingredientId,
            @Param("sinceDate") LocalDateTime sinceDate
    );
}