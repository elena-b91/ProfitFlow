package org.example.profitflow.Service;

import org.example.profitflow.Dto.MenuItemPerformanceDto;
import org.example.profitflow.Model.*;
import org.example.profitflow.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final MenuItemRepository menuItemRepository;
    private final OrderRepository orderRepository;

    public BigDecimal calculateFoodCost(MenuItem menuItem) {
        BigDecimal totalCost = BigDecimal.ZERO;

        if (menuItem.getRecipeIngredients() == null) {
            return totalCost;
        }

        for (RecipeIngredient recipeIngredient : menuItem.getRecipeIngredients()) {
            BigDecimal ingredientPrice = recipeIngredient.getIngredient().getPricePerUnit();
            BigDecimal quantityNeeded = recipeIngredient.getQuantityNeeded();

            BigDecimal ingredientCost = ingredientPrice.multiply(quantityNeeded);
            totalCost = totalCost.add(ingredientCost);
        }
        return totalCost.setScale(2, RoundingMode.HALF_UP);
    }
    /**
     * 1. SALES VOLUME BENCHMARK: Kasavana & Smith 70% Popularity Rule
     * Instead of a simple average, an item is considered popular if its sales volume
     * reaches at least 70% of the expected average sales per unique menu item.
     * Formula: Volume Threshold = (Total Units Sold / Total Unique Items) * 0.70
     * 2. PROFITABILITY BENCHMARK: Weighted Average Contribution Margin
     * Instead of looking at raw Food Cost percentages, this calculates the actual monetary
     * profit each sold unit contributes on average, factoring in sales volume.
     * An item is highly profitable if its individual margin meets or exceeds this baseline.
     * Formula: Weighted Margin Baseline = Sum(Individual Profit * Quantity Sold) / Total Units Sold
     */
    public List<MenuItemPerformanceDto> getMenuEngineeringReport(LocalDateTime start, LocalDateTime end) {
        List<MenuItem> allItems = menuItemRepository.findAll();
        List<Order> ordersInPeriod = orderRepository.findByCreatedAtBetween(start, end);

        if (allItems.isEmpty()) {
            return Collections.emptyList();
        }

        // 1. Extract sales volumes per item and calculate aggregate gross metrics
        Map<Long, Long> itemSalesCount = new HashMap<>();
        long totalSalesVolume = 0;
        BigDecimal totalGrossProfit = BigDecimal.ZERO;

        for (Order order : ordersInPeriod) {
            for (OrderItem item : order.getItems()) {
                Long itemId = item.getMenuItem().getId();
                itemSalesCount.put(itemId, itemSalesCount.getOrDefault(itemId, 0L) + item.getQuantity());
                totalSalesVolume += item.getQuantity();
            }
        }

        // Cache item-specific margins and costs to optimize performance
        Map<Long, BigDecimal> itemMargins = new HashMap<>();
        Map<Long, BigDecimal> itemFoodCosts = new HashMap<>();

        for (MenuItem item : allItems) {
            BigDecimal foodCost = calculateFoodCost(item);
            BigDecimal margin = item.getSellingPrice().subtract(foodCost);

            itemMargins.put(item.getId(), margin);
            itemFoodCosts.put(item.getId(), foodCost);

            long quantitySold = itemSalesCount.getOrDefault(item.getId(), 0L);
            totalGrossProfit = totalGrossProfit.add(margin.multiply(BigDecimal.valueOf(quantitySold)));
        }

        // 2. STATISTICAL BENCHMARK 1: The 70% Popularity Threshold
        // Determines if an item's volume meets market demand expectations
        double expectedSharePerItem = totalSalesVolume == 0 ? 0 : (double) totalSalesVolume / allItems.size();
        double volumeThreshold = expectedSharePerItem * 0.70;

        // 3. STATISTICAL BENCHMARK 2: Weighted Average Contribution Margin
        // Total Unit Profit Generated / Total Units Sold
        BigDecimal averageMarginThreshold = BigDecimal.ZERO;
        if (totalSalesVolume > 0) {
            averageMarginThreshold = totalGrossProfit.divide(BigDecimal.valueOf(totalSalesVolume), 2, RoundingMode.HALF_UP);
        }

        // 4. Map menu items into the analytical matrix
        List<MenuItemPerformanceDto> report = new ArrayList<>();

        for (MenuItem item : allItems) {
            long totalOrders = itemSalesCount.getOrDefault(item.getId(), 0L);
            BigDecimal currentItemMargin = itemMargins.get(item.getId());

            boolean isHighVolume = totalOrders >= volumeThreshold;
            boolean isHighProfit = currentItemMargin.compareTo(averageMarginThreshold) >= 0;

            ItemPerformanceCategory classification;
            if (isHighVolume && isHighProfit) {
                classification = ItemPerformanceCategory.HIGH_PERFORMANCE;
            } else if (isHighVolume) {
                classification = ItemPerformanceCategory.VOLUME_DRIVER;
            } else if (isHighProfit) {
                classification = ItemPerformanceCategory.MARGIN_GENERATOR;
            } else {
                classification = ItemPerformanceCategory.UNDER_PERFORMING;
            }

            report.add(MenuItemPerformanceDto.builder()
                    .menuItemName(item.getName())
                    .totalOrders(totalOrders)
                    .foodCost(itemFoodCosts.get(item.getId()))
                    .sellingPrice(item.getSellingPrice())
                    .profitMargin(currentItemMargin)
                    .classification(classification) // Now using the clean Enum type
                    .build());
        }

        return report;
    }

    /**
     * Analyzes trailing 30-day performance data to generate automated,
     * actionable optimization insights for business managers.
     */
    public List<String> getSmartAlerts() {
        List<String> alerts = new ArrayList<>();

        // Fetch trailing 30-day matrix report
        List<MenuItemPerformanceDto> report = getMenuEngineeringReport(
                LocalDateTime.now().minusDays(30),
                LocalDateTime.now()
        );

        for (MenuItemPerformanceDto dto : report) {
            if (ItemPerformanceCategory.UNDER_PERFORMING.equals(dto.getClassification())) {
                alerts.add("⚠️ PERFORMANCE ALERT: '" + dto.getMenuItemName() +
                        "' is classified as UNDER_PERFORMING. It fails to reach both the statistical volume threshold and the average profit baseline. Recommendation: Discontinue or replace.");
            }
            if (ItemPerformanceCategory.VOLUME_DRIVER.equals(dto.getClassification())) {
                alerts.add("💡 MARGIN OPTIMIZATION: '" + dto.getMenuItemName() +
                        "' is a VOLUME_DRIVER. It attracts high customer demand but operates below the establishment's average profit margin (" + dto.getProfitMargin() + "). Recommendation: Optimize recipe costs or adjust unit pricing.");
            }
            if (ItemPerformanceCategory.MARGIN_GENERATOR.equals(dto.getClassification())) {
                alerts.add("📈 PROMOTIONAL OPPORTUNITY: '" + dto.getMenuItemName() +
                        "' is a MARGIN_GENERATOR. It yields excellent profit margins (" + dto.getProfitMargin() + ") but lacks sales traction. Recommendation: Increase menu visibility or run targeted promotions.");
            }
        }
        return alerts;
    }
}