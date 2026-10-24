// Imported first in main.tsx so the API auth wrapper is in place before any
// other module (or its side effects) can call the mesh API.
import { installOperatorAuth } from './services/operatorAuth';

installOperatorAuth();
