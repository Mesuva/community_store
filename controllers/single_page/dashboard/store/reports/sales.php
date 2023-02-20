<?php

namespace Concrete\Package\CommunityStore\Controller\SinglePage\Dashboard\Store\Reports;

use Concrete\Core\Http\Request;
use Concrete\Core\Page\Controller\DashboardPageController;
use Concrete\Core\Routing\Redirect;
use Concrete\Core\Search\Pagination\PaginationFactory;
use Concrete\Package\CommunityStore\Src\CommunityStore\Order\OrderList;
use Concrete\Package\CommunityStore\Src\CommunityStore\Report\CsvReportExporter;
use Concrete\Package\CommunityStore\Src\CommunityStore\Report\SalesReport;
use Concrete\Package\CommunityStore\Src\CommunityStore\Utilities\Price;

class Sales extends DashboardPageController
{
    public function view()
    {
        $sr = new SalesReport();
        $this->set('sr', $sr);
        $this->requireAsset('chartist');
        $today = date('Y-m-d');
        $thirtyDaysAgo = date('Y-m-d', strtotime('-30 days'));
        $this->set('defaultFromDate', $thirtyDaysAgo);
        $this->set('defaultToDate', $today);

        $dateFrom = $this->request->request->get('dateFrom');
        $dateTo = $this->request->request->get('dateTo');
        if (!$dateFrom) {
            $dateFrom = $thirtyDaysAgo;
        }
        if (!$dateTo) {
            $dateTo = $today;
        }
        $this->set('dateFrom', $dateFrom);
        $this->set('dateTo', $dateTo);

        $ordersTotals = $sr::getTotalsByRange($dateFrom, $dateTo);
        $this->set('ordersTotals', $ordersTotals);

        $orderList = new OrderList();
        $orderList->setFromDate($dateFrom);
        $orderList->setToDate($dateTo);
        $orderList->setItemsPerPage(10);
        $orderList->setPaid(true);
        $orderList->setCancelled(false);

        $factory = new PaginationFactory($this->app->make(Request::class));
        $paginator = $factory->createPaginationObject($orderList);

        $pagination = $paginator->renderDefaultView();
        $this->set('orders', $paginator->getCurrentPageResults());
        $this->set('pagination', $pagination);
        $this->set('paginator', $paginator);

        $this->requireAsset('css', 'communityStoreDashboard');
        $this->set('pageTitle', t('Sales Report'));
    }

    public function export()
    {
        $from = $this->request->query->get('fromDate');
        $to = $this->request->query->get('toDate');

        //TODO maybe get all existing orders if needed
        // set to and from
        if ($to == '' || $to == null) {
            $to = date('Y-m-d'); // set to today
        }
        if ($from == '' || $from == null) {
            $from = strtotime('-7 day', $to); // set from a week ago
        }

        // get orders and set the from and to
        $orders = new OrderList();
        $orders->setFromDate($from);
        $orders->setToDate($to);
        //$orders->setItemsPerPage(10);
        $orders->setPaid(true);
        $orders->setCancelled(false);

        // exporting
        $export = [];
        // get all order requests
        $orders = $orders->getResults();

        foreach ($orders as $o) {
            // get tax info for our export data
            $tax = $o->getTaxTotal();
            $includedTax = $o->getIncludedTaxTotal();
            $orderTax = 0;
            if ($tax) {
                $orderTax = Price::format($tax);
            } elseif ($includedTax) {
                $orderTax = Price::format($includedTax);
            }
            // getOrderDate returns DateTime need to format it as string
            $date = $o->getOrderDate();
            // set up our export array

            $last = $o->getAttribute('billing_last_name');
            $first = $o->getAttribute('billing_first_name');

            $fullName = implode(', ', array_filter([$last, $first]));
            if (strlen($fullName) > 0) {
                $customerName = $fullName;
            } else {
                $customerName = '-';
            }

            $export[] = [
                'Order #' => $o->getOrderID(),
                'Date' => $date->format('Y-m-d H:i:s'),
                'Products' => $o->getSubTotal(),
                'Shipping' => $o->getShippingTotal(),
                'Tax' => $orderTax,
                'Total' => $o->getTotal(),
                'Payment Method' => $o->getPaymentMethodName(),
                'Transaction Reference' => $o->getTransactionReference(),
                'Customer Name' => $customerName,
                'Customer Email' => $o->getAttribute('email'),
            ];
        }

        // if we have something to export
        if (count($export) > 0) {
            $filename = 'sale_report_' . date('Y-m-d') . '.csv';

            $this->app->make(
                CsvReportExporter::class,
                [
                    'filename' => $filename,
                    'header' => array_keys(reset($export)),
                    'rows' => $export,
                ]
            )->getCsv();
        }
        // redirect if no data to output
        return Redirect::to('/dashboard/store/reports/sales');
    }
}
