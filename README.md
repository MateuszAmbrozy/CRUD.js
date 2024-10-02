Dokumentacja REST API do Zarządzania Koktajlami i Składnikami
-------------------------------------------------------------

### Opis

Celem API jest umożliwienie zarządzania **koktajlami** i ich **składnikami**. Aplikacja wspiera pełny CRUD (Create, Read, Update, Delete) dla koktajli oraz składników. Każdy koktajl zawiera listę składników, z których się go robi, a każdy składnik zawiera informacje o nazwie, opisie oraz czy jest alkoholem.

Struktura danych
----------------

### Koktajl (Cocktail)

Każdy koktajl posiada następujące pola:

*   id (UUID): Unikalny identyfikator koktajlu.
    
*   name (String): Nazwa koktajlu.
    
*   category (String): Kategoria koktajlu (np. alkoholowy, bezalkoholowy, deserowy).
    
*   instructions (String): Instrukcja jak przygotować koktajl.
    
*   ingredients (Array of Objects): Lista składników wraz z ilościami.
    
    *   Składnik zawiera:
        
        *   ingredientId (UUID): ID składnika.
            
        *   quantity (String): Ilość składnika wymagana do stworzenia koktajlu.
            

### Składnik (Ingredient)

Każdy składnik posiada następujące pola:

*   id (UUID): Unikalny identyfikator składnika.
    
*   name (String): Nazwa składnika.
    
*   description (String): Opis składnika.
    
*   isAlcohol (Boolean): Czy składnik zawiera alkohol.
    
*   image (String): URL zdjęcia składnika.
    

Narzędzia i technologie
-----------------------

*   **Node.js**: Platforma do budowania serwera.
    
*   **Express.js**: Framework do tworzenia API.
    
*   **MongoDB/Mongoose**: Baza danych NoSQL oraz ORM (Object Relational Mapping) do zarządzania danymi.
    
*   **UUID**: Unikalne identyfikatory zasobów (używane jako ID koktajli i składników).
    

Przykładowy model danych
------------------------

### Koktajl (Mongoose Schema)

### Składnik(Mongoose Schema)