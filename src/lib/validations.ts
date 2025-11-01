/**
 * Validaciones específicas para el sistema tributario ecuatoriano
 */

/**
 * Valida un RUC ecuatoriano completo (personas naturales y sociedades)
 * @param ruc - RUC de 13 dígitos
 * @returns objeto con resultado de validación y tipo de contribuyente
 */
export function validateRUC(ruc: string): {
  isValid: boolean;
  type: "persona_natural" | "sociedad_privada" | "sociedad_publica" | "invalid";
  message: string;
} {
  // Verificar que tenga exactamente 13 dígitos
  if (!/^\d{13}$/.test(ruc)) {
    return {
      isValid: false,
      type: "invalid",
      message: "El RUC debe tener exactamente 13 dígitos",
    };
  }

  const digits = ruc.split("").map(Number);

  // Verificar código de provincia (01-24)
  const province = parseInt(ruc.substring(0, 2));
  if (province < 1 || province > 24) {
    return {
      isValid: false,
      type: "invalid",
      message: "Código de provincia inválido (debe ser 01-24)",
    };
  }

  const thirdDigit = digits[2];
  let contributorType:
    | "persona_natural"
    | "sociedad_privada"
    | "sociedad_publica"
    | "invalid";
  let coefficients: number[];

  // Determinar tipo de contribuyente según el tercer dígito
  if (thirdDigit >= 0 && thirdDigit <= 5) {
    contributorType = "persona_natural";
    coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  } else if (thirdDigit === 6) {
    contributorType = "sociedad_publica";
    coefficients = [3, 2, 7, 6, 5, 4, 3, 2];
  } else if (thirdDigit === 9) {
    contributorType = "sociedad_privada";
    coefficients = [4, 3, 2, 7, 6, 5, 4, 3, 2];
  } else {
    return {
      isValid: false,
      type: "invalid",
      message: "Tercer dígito del RUC inválido",
    };
  }

  // Validar dígito verificador según el tipo
  let sum = 0;
  const digitCount = coefficients.length;

  if (contributorType === "persona_natural") {
    // Algoritmo para personas naturales (módulo 10)
    for (let i = 0; i < 9; i++) {
      let product = digits[i] * coefficients[i];
      if (product >= 10) {
        product = Math.floor(product / 10) + (product % 10);
      }
      sum += product;
    }
    const remainder = sum % 10;
    const checkDigit = remainder === 0 ? 0 : 10 - remainder;

    if (checkDigit === digits[9]) {
      return {
        isValid: true,
        type: contributorType,
        message: "RUC válido para persona natural",
      };
    }
  } else {
    // Algoritmo para sociedades (módulo 11)
    for (let i = 0; i < digitCount; i++) {
      sum += digits[i] * coefficients[i];
    }
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? 0 : 11 - remainder;

    if (checkDigit === digits[digitCount]) {
      const typeMessage =
        contributorType === "sociedad_publica"
          ? "sociedad pública"
          : "sociedad privada";
      return {
        isValid: true,
        type: contributorType,
        message: `RUC válido para ${typeMessage}`,
      };
    }
  }

  return {
    isValid: false,
    type: "invalid",
    message: "Dígito verificador incorrecto",
  };
}

/**
 * Valida un RUC ecuatoriano para persona natural (función de compatibilidad)
 * @param ruc - RUC de 13 dígitos
 * @returns true si es válido, false si no
 */
export function validatePersonaNaturalRUC(ruc: string): boolean {
  const result = validateRUC(ruc);
  return result.isValid && result.type === "persona_natural";
}

/**
 * Valida un número de teléfono ecuatoriano
 * @param phone - Número de teléfono
 * @returns true si es válido, false si no
 */
export function validateEcuadorianPhone(phone: string): boolean {
  // Limpiar el número de cualquier carácter no numérico
  const cleanPhone = phone.replace(/\D/g, "");

  // Verificar que tenga 10 dígitos y empiece con 0
  if (!/^0\d{9}$/.test(cleanPhone)) {
    return false;
  }

  // Verificar prefijos válidos para Ecuador
  const validPrefixes = [
    "02",
    "03",
    "04",
    "05",
    "06",
    "07", // Teléfonos fijos
    "08",
    "09", // Teléfonos móviles
  ];

  const prefix = cleanPhone.substring(0, 2);
  return validPrefixes.includes(prefix);
}

/**
 * Valida un email con formato estándar
 * @param email - Dirección de email
 * @returns true si es válido, false si no
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida una contraseña segura
 * @param password - Contraseña
 * @returns objeto con resultado de validación y mensaje
 */
export function validatePassword(password: string): {
  isValid: boolean;
  message: string;
} {
  if (password.length < 6) {
    return {
      isValid: false,
      message: "La contraseña debe tener al menos 6 caracteres",
    };
  }

  if (password.length < 8) {
    return {
      isValid: true,
      message: "Contraseña válida pero se recomienda al menos 8 caracteres",
    };
  }

  // Verificar que tenga al menos una letra y un número
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    return {
      isValid: true,
      message: "Se recomienda usar letras y números para mayor seguridad",
    };
  }

  return { isValid: true, message: "Contraseña segura" };
}

/**
 * Formatea un RUC para visualización
 * @param ruc - RUC sin formato
 * @returns RUC formateado (ej: 1234567890001)
 */
export function formatRUC(ruc: string): string {
  const cleanRUC = ruc.replace(/\D/g, "");
  if (cleanRUC.length === 13) {
    return cleanRUC;
  }
  return ruc;
}

/**
 * Formatea un teléfono para visualización
 * @param phone - Teléfono sin formato
 * @returns Teléfono formateado (ej: 0999-123-456)
 */
export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    return `${cleanPhone.substring(0, 4)}-${cleanPhone.substring(
      4,
      7
    )}-${cleanPhone.substring(7)}`;
  }
  return phone;
}
