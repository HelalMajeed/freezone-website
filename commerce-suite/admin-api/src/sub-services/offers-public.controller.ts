import { Controller, Get } from "@nestjs/common";
import { SubServicesService } from "./sub-services.service";

@Controller("offers")
export class OffersPublicController {
  constructor(private readonly subServices: SubServicesService) {}

  @Get()
  list() {
    return this.subServices.findPublicOffers();
  }
}
