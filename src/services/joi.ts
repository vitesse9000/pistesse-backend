import DateExtension from '@joi/date';
import * as JoiImport from 'joi';

export const Joi = JoiImport.extend(DateExtension);
