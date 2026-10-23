// ─── Datos mock para desarrollo sin backend ───
// Estos datos se usan cuando los microservicios no están disponibles.
// Demuestran la degradación parcial (fault tolerance) del sistema.

import type { B2BStore, Product, ProductWithMedia, Department, City } from "./types/types";

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 1, name: "La Paz" },
  { id: 2, name: "Santa Cruz" },
  { id: 3, name: "Cochabamba" },
  { id: 4, name: "Oruro" },
  { id: 5, name: "Potosí" },
  { id: 6, name: "Tarija" },
  { id: 7, name: "Chuquisaca" },
  { id: 8, name: "Beni" },
  { id: 9, name: "Pando" },
];

export const MOCK_CITIES: City[] = [
  // La Paz
  { id: 1, department_id: 1, name: "La Paz" },
  { id: 2, department_id: 1, name: "El Alto" },
  { id: 3, department_id: 1, name: "Viacha" },
  { id: 4, department_id: 1, name: "Achacachi" },
  // Santa Cruz
  { id: 5, department_id: 2, name: "Santa Cruz de la Sierra" },
  { id: 6, department_id: 2, name: "Montero" },
  { id: 7, department_id: 2, name: "Warnes" },
  { id: 8, department_id: 2, name: "La Guardia" },
  // Cochabamba
  { id: 9, department_id: 3, name: "Cochabamba" },
  { id: 10, department_id: 3, name: "Quillacollo" },
  { id: 11, department_id: 3, name: "Sacaba" },
  { id: 12, department_id: 3, name: "Tiquipaya" },
  // Oruro
  { id: 13, department_id: 4, name: "Oruro" },
  { id: 14, department_id: 4, name: "Challapata" },
  { id: 15, department_id: 4, name: "Huanuni" },
  // Potosí
  { id: 16, department_id: 5, name: "Potosí" },
  { id: 17, department_id: 5, name: "Uyuni" },
  { id: 18, department_id: 5, name: "Villazón" },
  { id: 19, department_id: 5, name: "Tupiza" },
  // Tarija
  { id: 20, department_id: 6, name: "Tarija" },
  { id: 21, department_id: 6, name: "Yacuiba" },
  { id: 22, department_id: 6, name: "Bermejo" },
  // Chuquisaca
  { id: 23, department_id: 7, name: "Sucre" },
  { id: 24, department_id: 7, name: "Monteagudo" },
  { id: 25, department_id: 7, name: "Camargo" },
  // Beni
  { id: 26, department_id: 8, name: "Trinidad" },
  { id: 27, department_id: 8, name: "Riberalta" },
  { id: 28, department_id: 8, name: "Guayaramerín" },
  { id: 29, department_id: 8, name: "Santa Ana de Yacuma" },
  // Pando
  { id: 30, department_id: 9, name: "Cobija" },
  { id: 31, department_id: 9, name: "Porvenir" },
  { id: 32, department_id: 9, name: "Puerto Rico" },
];