package org.example.profitflow.Model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "menuItem_id", nullable = false)
    private MenuItem menuItem;

    @Column(nullable = false)
    private Integer quantity; // Cât de des a fost comandat
}