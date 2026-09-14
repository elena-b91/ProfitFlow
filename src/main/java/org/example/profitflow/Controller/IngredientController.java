package org.example.profitflow.Controller;

import org.example.profitflow.Model.Ingredient;
import org.example.profitflow.Service.IngredientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/ingredients")
@RequiredArgsConstructor
public class IngredientController {

    private final IngredientService ingredientService;

    @PostMapping
    public ResponseEntity<Ingredient> createIngredient(@RequestBody Ingredient ingredient) {
        return ResponseEntity.ok(ingredientService.saveIngredient(ingredient));
    }

    @GetMapping
    public ResponseEntity<List<Ingredient>> getAllIngredients() {
        return ResponseEntity.ok(ingredientService.getAllIngredients());
    }

    @PatchMapping("/{id}/price")
    public ResponseEntity<Ingredient> updatePrice(
            @PathVariable Long id,
            @RequestParam BigDecimal newPrice) {
        return ResponseEntity.ok(ingredientService.updateIngredientPrice(id, newPrice));
    }
    /**
     * Endpoint to log food waste or expired stock items.
     * Example: PATCH /api/ingredients/5/waste?amount=1.50
     */
    @PatchMapping("/{id}/waste")
    public ResponseEntity<Ingredient> logWaste(
            @PathVariable Long id,
            @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ingredientService.reportWaste(id, amount));
    }
}