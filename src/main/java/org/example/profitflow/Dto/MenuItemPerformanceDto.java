package org.example.profitflow.Dto;
import lombok.*;
import org.example.profitflow.Model.ItemPerformanceCategory;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MenuItemPerformanceDto {
    private String menuItemName;
    private Long totalOrders;
    private BigDecimal foodCost;
    private BigDecimal sellingPrice;
    private BigDecimal profitMargin;
    private ItemPerformanceCategory classification;
}