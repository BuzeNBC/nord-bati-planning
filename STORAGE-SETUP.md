# 📦 Configuration Supabase Storage pour les Documents

## Étape 1 : Créer le bucket

1. Va dans ton projet Supabase
2. Menu gauche → **Storage**
3. Clique **New bucket**
4. Configure :
   - **Name** : `documents`
   - **Public bucket** : ✅ Coché (permet l'accès aux fichiers via URL)
5. Clique **Create bucket**

## Étape 2 : Configurer les policies (permissions)

1. Clique sur le bucket `documents`
2. Va dans l'onglet **Policies**
3. Clique **New policy** et crée ces 3 policies :

### Policy 1 : Permettre l'upload
- **Policy name** : `Allow public uploads`
- **Allowed operation** : INSERT
- **Target roles** : anon, authenticated
- **Policy definition** : `true`

Ou en SQL :
```sql
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'documents');
```

### Policy 2 : Permettre la lecture
- **Policy name** : `Allow public reads`
- **Allowed operation** : SELECT
- **Target roles** : anon, authenticated
- **Policy definition** : `true`

Ou en SQL :
```sql
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'documents');
```

### Policy 3 : Permettre la suppression
- **Policy name** : `Allow public deletes`
- **Allowed operation** : DELETE
- **Target roles** : anon, authenticated
- **Policy definition** : `true`

Ou en SQL :
```sql
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE TO anon, authenticated
USING (bucket_id = 'documents');
```

## Alternative : Script SQL complet

Exécute ce script dans **SQL Editor** :

```sql
-- Créer le bucket (nécessite service_role key)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800, -- 50MB max
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Policies
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE TO anon, authenticated
USING (bucket_id = 'documents');
```

## Vérification

Après configuration, tu devrais pouvoir :
1. Uploader un fichier via l'interface Nord Bati
2. Voir le fichier dans Supabase Storage
3. Cliquer sur le document dans l'app pour l'ouvrir

## Limites du plan gratuit Supabase

- **Stockage** : 1 GB
- **Bande passante** : 2 GB / mois
- **Taille max fichier** : 50 MB

Pour un usage pro, considère le plan Pro ($25/mois) qui offre :
- 100 GB stockage
- 200 GB bande passante
- Backups automatiques
