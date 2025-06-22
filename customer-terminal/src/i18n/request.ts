import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // This can either be defined statically at the top level of the file,
  // or based on a parameter (e.g. a locale from the pathname)
  const locale = 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
}); 