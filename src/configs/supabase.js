import { createClient } from "@supabase/supabase-js";

const  supabse = createClient(process.env.SUPABASE_ENDPOINT, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default supabse