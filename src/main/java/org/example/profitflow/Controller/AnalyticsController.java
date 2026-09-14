package org.example.profitflow.Controller;

import org.example.profitflow.Dto.MenuItemPerformanceDto;
import org.example.profitflow.Service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * Fetches the dynamic economic matrix report between two dates.
     * Example: /api/analytics/report?start=2026-05-01T00:00:00&end=2026-06-01T23:59:59
     */
    @GetMapping("/report")
    public ResponseEntity<List<MenuItemPerformanceDto>> getMenuPerformanceReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {

        // If the client does not supply a range, default to the last 30 days
        LocalDateTime resolvedEnd = (end == null) ? LocalDateTime.now() : end;
        LocalDateTime resolvedStart = (start == null) ? resolvedEnd.minusDays(30) : start;

        return ResponseEntity.ok(analyticsService.getMenuEngineeringReport(resolvedStart, resolvedEnd));
    }

    /**
     * Fetches automated optimization alerts based on trailing 30-day stats.
     */
    @GetMapping("/alerts")
    public ResponseEntity<List<String>> getSmartAlerts() {
        return ResponseEntity.ok(analyticsService.getSmartAlerts());
    }
}