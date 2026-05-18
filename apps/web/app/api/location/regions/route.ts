import { getRegionList } from '@/shared/lib/regionList';

export function GET() {
  return Response.json(getRegionList());
}
