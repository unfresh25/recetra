-- Official logos for every store (served from /public/stores). Jumbo keeps its existing logo.
update public.stores set logo_url = '/stores/' || slug || '.png'
where slug in ('exito', 'olimpica', 'd1', 'ara', 'carulla', 'megatiendas', 'makro', 'isimo', 'jumbo');
