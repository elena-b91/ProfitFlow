package org.example.profitflow.Service;

import org.example.profitflow.Model.Ingredient;
import org.example.profitflow.Repository.IngredientRepository;
import lombok.RequiredArgsConstructor;
import org.example.profitflow.Repository.OrderRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IngredientService {

    private final IngredientRepository ingredientRepository;
    private final OrderRepository orderRepository;
    private final UsdaFoodKeeperClient usdaFoodKeeperClient; // Injectat corect pentru managementul termenului de valabilitate

    /**
     * Saves a new inventory batch. Integrates the USDA FoodKeeper API
     * to dynamically calculate expiration dates and runs predictive algorithms.
     */
    public Ingredient saveIngredient(Ingredient ingredient) {
        if (ingredient.getEntranceDate() == null) {
            ingredient.setEntranceDate(LocalDate.now());
        }

        // At entrance, current stock equals the purchased quantity
        if (ingredient.getInStockQuantity() == null) {
            ingredient.setInStockQuantity(ingredient.getPurchasedQuantity());
        }

        // INTEGRATION: Fetch dynamic shelf life from USDA API if not manually forced
        if (ingredient.getExpirationDate() == null) {
            long shelfLifeDays = usdaFoodKeeperClient.getShelfLifeDaysFromUsda(ingredient.getName());
            ingredient.setExpirationDate(ingredient.getEntranceDate().plusDays(shelfLifeDays));
        }

        // Core business logic: Predict exit date based on historical consumption
        LocalDate prediction = calculatePredictedExitDate(ingredient);
        ingredient.setPredictedExitDate(prediction);

        return ingredientRepository.save(ingredient);
    }

    public LocalDate calculatePredictedExitDate(Ingredient ingredient) {
        // Dacă ingredientul este nou și nu are ID încă salvat în DB, nu avem istoric
        if (ingredient.getId() == null) {
            return ingredient.getEntranceDate().plusDays(14);
        }

        // Target istoric: ultimele 30 de zile
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        // 1. Extrage consumul real total (luând în calcul rețetele preparatelor vândute)
        BigDecimal totalConsumed = this.orderRepository.getTotalIngredientConsumptionSince(ingredient.getId(), thirtyDaysAgo);

        // 2. Calculăm viteza zilnică de consum: (Total Consumat / 30 Zile)
        BigDecimal dailyVelocity = totalConsumed.divide(BigDecimal.valueOf(30), 4, RoundingMode.HALF_UP);

        // 3. Fallback: Dacă nu s-a vândut nimic ce conține acest ingredient
        if (dailyVelocity.compareTo(BigDecimal.ZERO) <= 0) {
            return ingredient.getEntranceDate().plusDays(14);
        }

        // 4. Zile rămase = Stocul Actual / Consumul Zilnic
        BigDecimal daysRemaining = ingredient.getInStockQuantity()
                .divide(dailyVelocity, 0, RoundingMode.CEILING);

        // 5. Data estimată de epuizare
        return LocalDate.now().plusDays(daysRemaining.longValue());
    }

    public List<Ingredient> getAllIngredients() {
        return ingredientRepository.findAll();
    }

    public Ingredient updateIngredientPrice(Long id, BigDecimal newPrice) {
        Ingredient ingredient = ingredientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ingredient batch not found with id: " + id));
        ingredient.setPricePerUnit(newPrice);
        return ingredientRepository.save(ingredient);
    }

    /**
     * Records spoilage or active kitchen waste.
     * Deducts from current inventory stock and updates financial markers.
     */
    public Ingredient reportWaste(Long id, BigDecimal wastedAmount) {
        Ingredient ingredient = ingredientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inventory batch not found with id: " + id));

        BigDecimal newStock = ingredient.getInStockQuantity().subtract(wastedAmount);
        if (newStock.compareTo(BigDecimal.ZERO) < 0) {
            newStock = BigDecimal.ZERO;
        }

        ingredient.setInStockQuantity(newStock);
        ingredient.setWasteQuantity(ingredient.getWasteQuantity().add(wastedAmount));

        // If stock drops to zero, log the definitive real exit timestamp
        if (newStock.compareTo(BigDecimal.ZERO) == 0 && ingredient.getRealExitDate() == null) {
            ingredient.setRealExitDate(LocalDate.now());
        }

        return ingredientRepository.save(ingredient);
    }
}