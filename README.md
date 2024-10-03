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
    

Model danych
------------------------

### Koktajl (Mongoose Schema)
![image](https://github.com/user-attachments/assets/71358d67-c1f2-4431-995e-3350a193f7ea)

### Składnik(Mongoose Schema)
![image](https://github.com/user-attachments/assets/24c2f958-2405-419b-9b15-77ba3a4a7b4a)

### Screen shot z bazy danych
![image](https://github.com/user-attachments/assets/f681cc61-9544-4645-b490-363dbfba65ae)


![image](https://github.com/user-attachments/assets/4e05d50c-8ddf-41db-9a47-42e49dea80f9)

![image](https://github.com/user-attachments/assets/c7d1f95e-e29c-4e7f-8c81-6b91142b4a79)

![image](https://github.com/user-attachments/assets/01be55be-416c-4c13-bb67-3f69c9d931ec)

![image](https://github.com/user-attachments/assets/7b2da264-b7ac-4dad-958d-1c75a5529b7c)

![image](https://github.com/user-attachments/assets/b8a417a8-9b90-414a-bd7b-05d68b7c37c5)

------------------------


