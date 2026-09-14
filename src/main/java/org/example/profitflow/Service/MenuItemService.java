package org.example.profitflow.Service;

import org.example.profitflow.Model.MenuItem;
import org.example.profitflow.Repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;

    public MenuItem saveMenuItem(MenuItem menuItem) {
        // Înainte de salvare, ne asigurăm că legătura bidirecțională din JPA este setată corect
        if (menuItem.getRecipeIngredients() != null) {
            menuItem.getRecipeIngredients().forEach(ri -> ri.setMenuItem(menuItem));
        }
        return menuItemRepository.save(menuItem);
    }

    public MenuItem updateMenuItem(Long id, MenuItem menuItem) {
        MenuItem existingItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found with id: " + id));

        existingItem.setName(menuItem.getName());
        existingItem.setSellingPrice(menuItem.getSellingPrice());

        if (existingItem.getRecipeIngredients() != null) {
            existingItem.getRecipeIngredients().clear(); // Șterge rețeta veche din baza de date

            if (menuItem.getRecipeIngredients() != null) {
                // Adăugăm elementele noi și le legăm corect de obiectul existent parinte
                menuItem.getRecipeIngredients().forEach(ri -> {
                    ri.setMenuItem(existingItem);
                    existingItem.getRecipeIngredients().add(ri);
                });
            }
        }

        return menuItemRepository.save(existingItem);
    }

    public void deleteMenuItem(Long id) {
        menuItemRepository.deleteById(id);
    }

    public List<MenuItem> getAllMenuItems() {
        return menuItemRepository.findAll();
    }
}