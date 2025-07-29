"""
Security utilities for SQL injection prevention and input validation.
"""
import re
import html
from functools import wraps
from flask import request, abort, flash, redirect, url_for


class InputValidator:
    """Input validation and sanitization utilities."""
    
    # Define allowed characters for different input types
    CUSTOMER_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9\s\-\.\'\,]{1,100}$')
    SEARCH_PATTERN = re.compile(r'^[a-zA-Z0-9\s\-\.\'\,]{0,100}$')
    MENU_ITEM_PATTERN = re.compile(r'^[a-zA-Z0-9\s\-\.\'\,\&]{1,50}$')
    NOTES_PATTERN = re.compile(r'^[a-zA-Z0-9\s\-\.\'\,\!\?\&\(\)]{0,500}$')
    
    # SQL injection patterns to detect
    SQL_INJECTION_PATTERNS = [
        re.compile(r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)', re.IGNORECASE),
        re.compile(r'(--|#|/\*|\*/)', re.IGNORECASE),
        re.compile(r'(\'\s*(OR|AND)\s*\'\s*=\s*\')', re.IGNORECASE),
        re.compile(r'(\bUNION\b.*?\bSELECT\b)', re.IGNORECASE),
        re.compile(r'(\bOR\b\s*\'\d+\'\s*=\s*\'\d+\')', re.IGNORECASE),
        re.compile(r'(\bAND\b\s*\'\d+\'\s*=\s*\'\d+\')', re.IGNORECASE),
        re.compile(r'(\'\s*OR\s*1\s*=\s*1)', re.IGNORECASE),
        re.compile(r'(\'\s*AND\s*1\s*=\s*1)', re.IGNORECASE),
    ]
    
    @staticmethod
    def sanitize_string(input_str, max_length=None):
        """
        Sanitize a string input by removing potentially dangerous characters.
        
        Args:
            input_str (str): The input string to sanitize
            max_length (int): Maximum allowed length
            
        Returns:
            str: Sanitized string
        """
        if not input_str:
            return ""
        
        # Convert to string and strip whitespace
        sanitized = str(input_str).strip()
        
        # HTML escape to prevent XSS
        sanitized = html.escape(sanitized)
        
        # Remove null bytes and other control characters
        sanitized = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', sanitized)
        
        # Limit length if specified
        if max_length and len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        return sanitized
    
    @staticmethod
    def validate_customer_name(name):
        """
        Validate customer name input.
        
        Args:
            name (str): Customer name to validate
            
        Returns:
            tuple: (is_valid, sanitized_name, error_message)
        """
        if not name:
            return False, "", "Customer name is required"
        
        sanitized = InputValidator.sanitize_string(name, 100)
        
        if not InputValidator.CUSTOMER_NAME_PATTERN.match(sanitized):
            return False, "", "Customer name contains invalid characters"
        
        if InputValidator.contains_sql_injection(sanitized):
            return False, "", "Invalid customer name format"
        
        return True, sanitized, None
    
    @staticmethod
    def validate_search_query(query):
        """
        Validate search query input.
        
        Args:
            query (str): Search query to validate
            
        Returns:
            tuple: (is_valid, sanitized_query, error_message)
        """
        if not query:
            return True, "", None
        
        sanitized = InputValidator.sanitize_string(query, 100)
        
        if not InputValidator.SEARCH_PATTERN.match(sanitized):
            return False, "", "Search query contains invalid characters"
        
        if InputValidator.contains_sql_injection(sanitized):
            return False, "", "Invalid search query format"
        
        return True, sanitized, None
    
    @staticmethod
    def validate_menu_item(item_name):
        """
        Validate menu item name.
        
        Args:
            item_name (str): Menu item name to validate
            
        Returns:
            tuple: (is_valid, sanitized_name, error_message)
        """
        if not item_name:
            return False, "", "Item name is required"
        
        sanitized = InputValidator.sanitize_string(item_name, 50)
        
        if not InputValidator.MENU_ITEM_PATTERN.match(sanitized):
            return False, "", "Item name contains invalid characters"
        
        if InputValidator.contains_sql_injection(sanitized):
            return False, "", "Invalid item name format"
        
        return True, sanitized, None
    
    @staticmethod
    def validate_notes(notes):
        """
        Validate order notes.
        
        Args:
            notes (str): Notes to validate
            
        Returns:
            tuple: (is_valid, sanitized_notes, error_message)
        """
        if not notes:
            return True, "", None
        
        sanitized = InputValidator.sanitize_string(notes, 500)
        
        if not InputValidator.NOTES_PATTERN.match(sanitized):
            return False, "", "Notes contain invalid characters"
        
        if InputValidator.contains_sql_injection(sanitized):
            return False, "", "Invalid notes format"
        
        return True, sanitized, None
    
    @staticmethod
    def validate_price(price_str):
        """
        Validate price input.
        
        Args:
            price_str (str): Price string to validate
            
        Returns:
            tuple: (is_valid, price_float, error_message)
        """
        if not price_str:
            return True, None, None
        
        try:
            price = float(price_str)
            if price < 0 or price > 999.99:
                return False, None, "Price must be between 0 and 999.99"
            return True, price, None
        except ValueError:
            return False, None, "Invalid price format"
    
    @staticmethod
    def validate_status(status):
        """
        Validate order status.
        
        Args:
            status (str): Status to validate
            
        Returns:
            tuple: (is_valid, status, error_message)
        """
        valid_statuses = ['pending', 'in_progress', 'completed']
        if status not in valid_statuses:
            return False, None, f"Status must be one of: {', '.join(valid_statuses)}"
        return True, status, None
    
    @staticmethod
    def validate_item_type(item_type):
        """
        Validate menu item type.
        
        Args:
            item_type (str): Item type to validate
            
        Returns:
            tuple: (is_valid, item_type, error_message)
        """
        valid_types = ['drink', 'milk', 'syrup', 'foam']
        if item_type not in valid_types:
            return False, None, f"Item type must be one of: {', '.join(valid_types)}"
        return True, item_type, None
    
    @staticmethod
    def validate_integer_id(id_str):
        """
        Validate integer ID.
        
        Args:
            id_str (str): ID string to validate
            
        Returns:
            tuple: (is_valid, id_int, error_message)
        """
        try:
            id_int = int(id_str)
            if id_int <= 0:
                return False, None, "ID must be a positive integer"
            return True, id_int, None
        except (ValueError, TypeError):
            return False, None, "Invalid ID format"
    
    @staticmethod
    def contains_sql_injection(input_str):
        """
        Check if input contains potential SQL injection patterns.
        
        Args:
            input_str (str): String to check
            
        Returns:
            bool: True if potential SQL injection detected
        """
        if not input_str:
            return False
        
        for pattern in InputValidator.SQL_INJECTION_PATTERNS:
            if pattern.search(input_str):
                return True
        
        return False
    
    @staticmethod
    def escape_like_pattern(pattern):
        """
        Escape special characters in LIKE patterns to prevent SQL injection.
        
        Args:
            pattern (str): Pattern to escape
            
        Returns:
            str: Escaped pattern
        """
        if not pattern:
            return ""
        
        # Escape SQL LIKE wildcards and special characters
        escaped = pattern.replace('\\', '\\\\')  # Escape backslashes first
        escaped = escaped.replace('%', '\\%')    # Escape percent signs
        escaped = escaped.replace('_', '\\_')    # Escape underscores
        escaped = escaped.replace('[', '\\[')    # Escape square brackets
        
        return escaped


def validate_input(validation_func):
    """
    Decorator to validate input using specified validation function.
    
    Args:
        validation_func: Function to use for validation
        
    Returns:
        Decorated function
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # This decorator can be customized based on specific needs
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_valid_id(f):
    """
    Decorator to validate integer ID parameters in routes.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Extract ID from kwargs or args
        for key, value in kwargs.items():
            if key.endswith('_id'):
                is_valid, validated_id, error = InputValidator.validate_integer_id(value)
                if not is_valid:
                    flash(f"Invalid {key}: {error}")
                    return redirect(request.referrer or url_for('index'))
                kwargs[key] = validated_id
        
        return f(*args, **kwargs)
    return decorated_function


class SecureDatabase:
    """
    Secure database operations with built-in SQL injection prevention.
    """
    
    @staticmethod
    def safe_like_query(db, base_query, search_fields, search_term, additional_params=None):
        """
        Execute a safe LIKE query with proper escaping.
        
        Args:
            db: Database connection
            base_query (str): Base SQL query with placeholders
            search_fields (list): List of field names to search
            search_term (str): Term to search for
            additional_params (list): Additional parameters for the query
            
        Returns:
            Query results
        """
        if not search_term:
            return db.execute(base_query, additional_params or []).fetchall()
        
        # Validate and sanitize search term
        is_valid, sanitized_term, error = InputValidator.validate_search_query(search_term)
        if not is_valid:
            raise ValueError(f"Invalid search term: {error}")
        
        # Escape the search term for LIKE patterns
        escaped_term = InputValidator.escape_like_pattern(sanitized_term)
        like_pattern = f'%{escaped_term}%'
        
        # Build the query with proper parameterization
        like_conditions = ' OR '.join([f'{field} LIKE ?' for field in search_fields])
        full_query = base_query.replace('{{LIKE_CONDITIONS}}', like_conditions)
        
        # Prepare parameters
        params = [like_pattern] * len(search_fields)
        if additional_params:
            params.extend(additional_params)
        
        return db.execute(full_query, params).fetchall()
