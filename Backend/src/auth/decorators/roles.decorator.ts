// Ficheiro: src/auth/decorators/roles.decorator.ts

/* O que é um decorator?

Exemplos que já usaste sem pensar muito nisso:

@Controller('marketplace')
@Get()
@Post()
@Body()
@Param('id')
@UseGuards(AuthGuard)

Com este ficheiro, criamos um novo decorator "@Roles()" que funciona de forma semelhante,
mas em vez de ser algo pré-definido pelo NestJS, 
é algo que nós criamos para as nossas necessidades específicas.
*/

import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/roles.enum';

// Chave usada para guardar as roles no metadata do endpoint/controller.
export const ROLES_KEY = 'roles';

// Decorator que permite declarar quais as roles autorizadas.
// Exemplo:
// @Roles(Role.COORDENADOR)
// @Roles(Role.COORDENADOR, Role.DIRECAO)
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/* 
O que é metadata?
Metadata é um conceito que permite associar informações adicionais a classes, métodos ou propriedades.
No caso do @Roles(), quando aplicamos este decorator a um endpoint ou controller,
estamos a associar uma lista de roles autorizadas a esse endpoint/controller.
O guard (RolesGuard) depois vai ler essa metadata para decidir se o utilizador tem permissão para aceder ou não.
No exemplo do @Roles(Role.COORDENADOR), estamos a dizer que apenas utilizadores com a role "Coordenador" podem aceder a esse endpoint.
*/