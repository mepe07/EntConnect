import { ProtectedRoute } from "~/components/protected-route.component";
import { EducandosEE } from "~/views/educandos/educandos-ee";

const title = "Os Meus Educandos | EntConnect";

export default function EducandosRoute() {
    return (
        <ProtectedRoute rolesPermitidas={['Enc_Educacao', 'EncEducacao']}>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <EducandosEE />
        </ProtectedRoute>
    );
}
