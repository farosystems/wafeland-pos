#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔐 Configuración de Seguridad - Server Actions');
console.log('==============================================\n');

// Verificar si existe .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ Archivo .env.local encontrado');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Verificar variables requeridas
  const requiredVars = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!envContent.includes(varName)) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length === 0) {
    console.log('✅ Todas las variables de entorno están configuradas');
  } else {
    console.log('❌ Faltan las siguientes variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n📝 Agrega estas variables a tu archivo .env.local');
  }
} else {
  console.log('❌ Archivo .env.local no encontrado');
  console.log('📝 Crea el archivo .env.local con las siguientes variables:\n');
  
  const envTemplate = `# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase Service Role Key (for Server Actions - KEEP SECRET)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
`;
  
  console.log(envTemplate);
}

console.log('\n📋 Próximos pasos:');
console.log('1. Configura las variables de entorno en .env.local');
console.log('2. Ejecuta el SQL para agregar clerk_user_id a la tabla usuarios');
console.log('3. Actualiza los usuarios existentes con su clerk_user_id');
console.log('4. Prueba la funcionalidad con diferentes roles de usuario');

console.log('\n🔧 SQL para ejecutar en Supabase:');
console.log(`
-- Agregar campo para Clerk User ID
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_usuarios_clerk_user_id ON usuarios(clerk_user_id);

-- Actualizar usuarios existentes (ejemplo)
-- UPDATE usuarios SET clerk_user_id = 'user_2abc123def456' WHERE email = 'tu_email@ejemplo.com';
`);

console.log('\n✅ ¡Listo! Tu aplicación ahora es más segura con Server Actions.'); 