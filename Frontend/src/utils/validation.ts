export const validateEmail = (email: string): boolean =>
  /^[\w.-]+@[\w.-]+\.\w{2,}$/.test(email.trim());

export const validatePhone = (phone: string): boolean =>
  /^[\d\s+()-]{8,20}$/.test(phone.trim());

export const validateUsername = (username: string): boolean =>
  /^[a-zA-Z0-9_]{3,30}$/.test(username.trim());

export const validatePassword = (password: string, minLength = 6): boolean =>
  password.length >= minLength;

export const validateAmount = (amount: number): boolean =>
  !isNaN(amount) && amount > 0;

export const validateNonNegativeAmount = (amount: number): boolean =>
  !isNaN(amount) && amount >= 0;

export const validateCardNumber = (cardNumber: string): boolean =>
  /^\d{16}$/.test(cardNumber.replace(/\s/g, ''));

export const validateCvv = (cvv: string): boolean =>
  /^\d{3}$/.test(cvv);

export const validateRequired = (value: string): boolean =>
  value.trim().length > 0;

export const validateAgencyCode = (code: string): boolean =>
  /^[A-Z0-9]{2,10}$/.test(code.trim().toUpperCase());

export interface AccountFormFields {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  username: string;
  password: string;
  initialBalance: number;
}

export const validateAccountForm = (form: AccountFormFields): string | null => {
  if (!validateRequired(form.fullName)) return 'Le nom complet est requis';
  if (!validateEmail(form.email)) return 'Email invalide';
  if (!validatePhone(form.phone)) return 'Numéro de téléphone invalide (8 à 20 caractères)';
  if (!validateRequired(form.address)) return 'L\'adresse est requise';
  if (!validateUsername(form.username)) return 'Nom d\'utilisateur invalide (3-30 caractères, lettres/chiffres/_)';
  if (!validatePassword(form.password)) return 'Le mot de passe doit contenir au moins 6 caractères';
  if (!validateNonNegativeAmount(form.initialBalance)) return 'Le solde initial ne peut pas être négatif';
  return null;
};

export interface UserFormFields {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  username?: string;
  password?: string;
}

export const validateUserForm = (user: UserFormFields, requirePassword = false): string | null => {
  if (!validateRequired(user.fullName)) return 'Le nom complet est requis';
  if (!validateEmail(user.email)) return 'Email invalide';
  if (!validatePhone(user.phone)) return 'Numéro de téléphone invalide';
  if (!validateRequired(user.address)) return 'L\'adresse est requise';
  if (user.username !== undefined && !validateUsername(user.username)) {
    return 'Nom d\'utilisateur invalide';
  }
  if (requirePassword && user.password !== undefined && !validatePassword(user.password)) {
    return 'Le mot de passe doit contenir au moins 6 caractères';
  }
  return null;
};

export interface AgencyFormFields {
  code: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export const hasFieldErrors = <T extends object>(errors: FieldErrors<T>): boolean =>
  Object.values(errors).some((message) => Boolean(message));

export const validateAccountFormFields = (form: AccountFormFields): FieldErrors<AccountFormFields> => {
  const errors: FieldErrors<AccountFormFields> = {};
  if (!validateRequired(form.fullName)) errors.fullName = 'Le nom complet est requis';
  if (!validateEmail(form.email)) errors.email = 'Adresse email invalide';
  if (!validatePhone(form.phone)) errors.phone = 'Téléphone invalide (8 à 20 caractères)';
  if (!validateRequired(form.address)) errors.address = 'L\'adresse est requise';
  if (!validateUsername(form.username)) errors.username = '3 à 30 caractères : lettres, chiffres ou _';
  if (!validatePassword(form.password)) errors.password = 'Minimum 6 caractères';
  if (form.initialBalance === undefined || form.initialBalance === null || isNaN(form.initialBalance)) {
    errors.initialBalance = 'Saisissez un montant valide';
  } else if (!validateNonNegativeAmount(form.initialBalance)) {
    errors.initialBalance = 'Le solde initial ne peut pas être négatif';
  }
  return errors;
};

export const validateUserFormFields = (
  user: UserFormFields,
  requirePassword = false
): FieldErrors<UserFormFields> => {
  const errors: FieldErrors<UserFormFields> = {};
  if (!validateRequired(user.fullName)) errors.fullName = 'Le nom complet est requis';
  if (!validateEmail(user.email)) errors.email = 'Adresse email invalide';
  if (!validatePhone(user.phone)) errors.phone = 'Téléphone invalide';
  if (!validateRequired(user.address)) errors.address = 'L\'adresse est requise';
  if (user.username !== undefined && user.username !== '' && !validateUsername(user.username)) {
    errors.username = 'Nom d\'utilisateur invalide';
  }
  if (requirePassword && user.password !== undefined && !validatePassword(user.password)) {
    errors.password = 'Minimum 6 caractères';
  }
  return errors;
};

export interface CardFormFields {
  cardNumber: string;
  cardType: string;
  accountId: number;
  expirationDate: string;
  cvv: string;
}

export const validateCardFormFields = (form: CardFormFields): FieldErrors<CardFormFields> => {
  const errors: FieldErrors<CardFormFields> = {};
  if (!validateCardNumber(form.cardNumber)) errors.cardNumber = 'Le numéro doit contenir 16 chiffres';
  if (!form.cardType) errors.cardType = 'Sélectionnez un type de carte';
  if (!form.accountId || form.accountId <= 0) errors.accountId = 'Sélectionnez un compte client';
  if (!form.expirationDate) errors.expirationDate = 'La date d\'expiration est requise';
  if (!validateCvv(form.cvv)) errors.cvv = 'Le CVV doit contenir 3 chiffres';
  return errors;
};

export interface OperationFormFields {
  amount: number;
  toAccountNumber?: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  availableBalance?: number;
}

export const validateOperationFormFields = (form: OperationFormFields): FieldErrors<OperationFormFields> => {
  const errors: FieldErrors<OperationFormFields> = {};
  if (!validateAmount(form.amount)) errors.amount = 'Le montant doit être supérieur à 0';
  if (form.type === 'transfer') {
    if (!form.toAccountNumber?.trim()) errors.toAccountNumber = 'Numéro de compte destinataire requis';
  }
  if ((form.type === 'withdraw' || form.type === 'transfer') && form.availableBalance !== undefined) {
    if (form.amount > form.availableBalance) errors.amount = 'Solde insuffisant';
  }
  return errors;
};

export const validateAgencyForm = (agency: AgencyFormFields): string | null => {
  if (!validateAgencyCode(agency.code)) return 'Code agence invalide (2-10 caractères alphanumériques)';
  if (!validateRequired(agency.name)) return 'Le nom de l\'agence est requis';
  if (!validateRequired(agency.address)) return 'L\'adresse est requise';
  if (!validatePhone(agency.phone)) return 'Téléphone invalide';
  if (!validateEmail(agency.email)) return 'Email invalide';
  return null;
};
