import { PrismaSelect } from '@paljs/plugins';

export default function getSelectPrisma(info, options = {}) {
    return new PrismaSelect(info, {...options}).value;
}
