package org.example.profitflow.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import java.util.Map;
import java.util.List;

@Component
public class UsdaFoodKeeperClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String usdaUrl = "https://api.nal.usda.gov/fdc/v1/foods/search";

    // Injectată corect din application.properties
    @Value("${usda.api.key}")
    private String apiKey;

    /**
     * Queries the USDA FoodData Central API to find the recommended shelf life days
     * for a given ingredient name.
     */
    public long getShelfLifeDaysFromUsda(String ingredientName) {
        try {
            // Am înlocuit .fromHttpUrl cu .fromUriString, care este complet compatibil
            String url = UriComponentsBuilder.fromUriString(usdaUrl)
                    .queryParam("api_key", apiKey)
                    .queryParam("query", ingredientName)
                    .queryParam("pageSize", 1) // Vrem doar cel mai relevant rezultat
                    .toUriString();

            // Interogăm API-ul USDA
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response != null && response.containsKey("foods")) {
                List<?> foods = (List<?>) response.get("foods");
                if (!foods.isEmpty()) {
                    Map<?, ?> topFoodItem = (Map<?, ?>) foods.get(0);

                    if (topFoodItem.containsKey("foodCategory")) {
                        String category = (String) topFoodItem.get("foodCategory");
                        return mapCategoryToShelfLifeDays(category);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ USDA API Failure: " + e.getMessage() + ". Using fallback retention logic.");
        }

        return 7; // Fallback sigur: 7 zile pentru produse proaspete nespecificate
    }

    /**
     * Algoritm intern de mapare a categoriilor oficiale USDA la zile de valabilitate standard (FoodKeeper baseline)
     */
    private long mapCategoryToShelfLifeDays(String category) {
        String lowerCategory = category.toLowerCase();
        if (lowerCategory.contains("vegetable") || lowerCategory.contains("fruit")) return 5;
        if (lowerCategory.contains("meat") || lowerCategory.contains("poultry") || lowerCategory.contains("fish")) return 3;
        if (lowerCategory.contains("dairy") || lowerCategory.contains("milk") || lowerCategory.contains("cheese")) return 10;
        if (lowerCategory.contains("bakery") || lowerCategory.contains("bread")) return 4;

        return 14;
    }
}